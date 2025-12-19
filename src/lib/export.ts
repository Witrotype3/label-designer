import jsPDF from 'jspdf';
import { LabelTemplate, MasterLabel, DesignElement, TextElement, ShapeElement, ImageElement, PlaceholderElement } from '@/types';
import { DataRow, useDataStore } from '@/store/dataStore';
import { mmToPx, SCREEN_DPI } from '@/lib/dimensions';
import { getLabelPosition } from '@/lib/templates';
import { getAllAssets, getAssetDataUrl, initializeAssets } from '@/lib/assets';
import QRCode from 'qrcode';

// Print DPI for high quality output
const PRINT_DPI = 300;

interface ExportOptions {
    template: LabelTemplate;
    masterLabel: MasterLabel;
    rows: DataRow[];
    filename?: string;
    selectedRowIds?: Set<string>; // Optional: filter to only selected rows
    onProgress?: (current: number, total: number) => void; // Progress callback
}

export const generateBulkPDF = async ({
    template,
    masterLabel,
    rows,
    filename = 'labels.pdf',
    selectedRowIds,
    onProgress
}: ExportOptions) => {
    // Initialize assets database
    await initializeAssets();
    
    // 1. Create PDF
    // 'p' = portrait, 'mm' = units, format = [width, height] custom or standard
    const sheetWidth = template.sheetConfig.width;
    const sheetHeight = template.sheetConfig.height;

    // jsPDF expects dimensions in the units specified (mm).
    const pdf = new jsPDF({
        orientation: sheetWidth > sheetHeight ? 'l' : 'p',
        unit: 'mm',
        format: [sheetWidth, sheetHeight]
    });

    const labelsPerSheet = template.rows * template.columns;
    
    // Filter rows if selection is provided
    let effectiveRows = rows;
    if (selectedRowIds && selectedRowIds.size > 0) {
        effectiveRows = rows.filter(row => selectedRowIds.has(row.id));
    }
    
    const totalLabels = effectiveRows.length;

    // If no rows, print one sheet with master design (template mode)
    if (totalLabels === 0) {
        effectiveRows = [{ id: 'demo' }];
    }

    // Helper canvas for rendering individual labels at high DPI
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to create canvas context for PDF export. Your browser may not support canvas rendering.');
    }

    // Canvas size needs to match the sheet size at PRINT_DPI
    const scaleFactor = PRINT_DPI / 25.4; // px per mm
    canvas.width = Math.ceil(sheetWidth * scaleFactor);
    canvas.height = Math.ceil(sheetHeight * scaleFactor);

    // Pre-scale context so drawing operations using mm work directly?
    // jsPDF addImage takes pixel data.
    // Easier to map mm -> px manually for drawing, then export canvas to image.

    // Iterate through data
    let currentSheetIndex = 0;

    const totalSheets = Math.ceil(effectiveRows.length / labelsPerSheet);
    let processedLabels = 0;

    // We process sheet by sheet
    for (let i = 0; i < effectiveRows.length; i += labelsPerSheet) {
        if (i > 0) {
            pdf.addPage([sheetWidth, sheetHeight], sheetWidth > sheetHeight ? 'l' : 'p');
        }

        // Clear canvas for new sheet
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw sheet labels
        const sheetRows = effectiveRows.slice(i, i + labelsPerSheet);

        for (let j = 0; j < sheetRows.length; j++) {
            const rowData = sheetRows[j];
            const position = getLabelPosition(template, j);
            if (!position) continue;

            // Render single label at position
            await renderLabelToContext(ctx, template, masterLabel, rowData, position, scaleFactor);
            
            processedLabels++;
            // Report progress (by labels, not sheets)
            if (onProgress) {
                onProgress(processedLabels, effectiveRows.length);
                // Allow UI to update
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Add full sheet canvas to PDF
        // verify: addImage(imageData, format, x, y, w, h)
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, sheetWidth, sheetHeight);
    }

    pdf.save(filename);
    
    // Final progress update
    if (onProgress) {
        onProgress(effectiveRows.length, effectiveRows.length);
    }
};

const renderLabelToContext = async (
    ctx: CanvasRenderingContext2D,
    template: LabelTemplate,
    masterLabel: MasterLabel,
    rowData: DataRow | any,
    position: { x: number, y: number },
    scale: number
) => {
    const labelX = position.x * scale;
    const labelY = position.y * scale;
    const labelW = template.labelWidth * scale;
    const labelH = template.labelHeight * scale;

    // Don't clip to label area - allow content to extend beyond boundaries
    // for printer tolerance (printers don't print perfectly aligned)
    ctx.save();
    // Removed clipping: ctx.clip() was here but removed to allow content overflow

    // Draw background (if any in master, or white default)
    // masterLabel.backgroundColor is usually #ffffff or transparent
    if (masterLabel.backgroundColor) {
        ctx.fillStyle = masterLabel.backgroundColor;
        ctx.fillRect(labelX, labelY, labelW, labelH);
    }

    // Render elements
    for (const element of masterLabel.elements) {
        if (!element.visible) continue;

        // Transform to label local coords -> canvas coords
        const elX = labelX + (element.transform.x * scale);
        const elY = labelY + (element.transform.y * scale);
        const elW = element.transform.width * scale;
        const elH = element.transform.height * scale;

        ctx.save();

        // Rotation
        if (element.transform.rotation !== 0) {
            ctx.translate(elX + elW / 2, elY + elH / 2);
            ctx.rotate((element.transform.rotation * Math.PI) / 180);
            ctx.translate(-(elX + elW / 2), -(elY + elH / 2));
        }

        switch (element.type) {
            case 'text':
                renderText(ctx, element as TextElement, elX, elY, elW, elH, rowData, scale);
                break;
            case 'shape':
                renderShape(ctx, element as ShapeElement, elX, elY, elW, elH, scale);
                break;
            case 'image':
                // await renderImage(ctx, element as ImageElement, elX, elY, elW, elH);
                break;
            case 'placeholder':
                await renderPlaceholder(ctx, element as PlaceholderElement, elX, elY, elW, elH, rowData, scale);
                break;
        }

        ctx.restore();
    }

    ctx.restore();
};

const renderText = (
    ctx: CanvasRenderingContext2D,
    element: TextElement,
    x: number,
    y: number,
    w: number,
    h: number,
    rowData: any,
    scale: number
) => {
    // Variable substitution
    let content = element.content;
    if (rowData) {
        // Get columns from store (outside React context, use getState)
        const columns = useDataStore.getState().columns;
        
        content = content.replace(/\{([^}]+)\}/g, (match, key) => {
            const cleanKey = key.trim();
            
            // First, try to find column by name (case-insensitive)
            const column = columns.find(c => c.name.toLowerCase() === cleanKey.toLowerCase());
            if (column) {
                // Use column ID to access row data
                const value = rowData[column.id];
                if (value !== undefined && value !== null && value !== '') {
                    return String(value);
                }
            }
            
            // Fall back to direct key matching for backward compatibility
            const rowKey = Object.keys(rowData).find(k => k.toLowerCase() === cleanKey.toLowerCase());
            if (rowKey && rowData[rowKey] !== undefined && rowData[rowKey] !== null && rowData[rowKey] !== '') {
                return String(rowData[rowKey]);
            }
            
            // Replace with empty string if not found
            return '';
        });
    }

    ctx.fillStyle = element.color;
    // Scale font size: pt -> mm -> px (at 300 DPI)
    // 1 pt = 1/72 inch. 1 inch = 25.4 mm.
    // pt * (25.4 / 72) = mm
    // mm * scale = px
    // simpler: pt / 72 * PRINT_DPI = px
    const fontSizePx = (element.fontSize / 72) * PRINT_DPI;

    ctx.font = `${element.fontStyle} ${element.fontWeight} ${fontSizePx}px ${element.fontFamily}`;
    ctx.textBaseline = 'top';

    // Helper function to wrap text to fit within width
    const wrapText = (text: string, maxWidth: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && currentLine) {
                // Current line is full, start a new line
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.length > 0 ? lines : [''];
    };

    // Split by manual newlines first, then wrap each line
    const manualLines = content.split('\n');
    const allLines: string[] = [];
    
    manualLines.forEach(line => {
        const wrapped = wrapText(line, w);
        allLines.push(...wrapped);
    });

    const lineHeight = fontSizePx * element.lineHeight;

    allLines.forEach((line, index) => {
        let textX = x;
        if (element.textAlign === 'center') {
            ctx.textAlign = 'center';
            textX = x + w / 2;
        } else if (element.textAlign === 'right') {
            ctx.textAlign = 'right';
            textX = x + w;
        } else {
            ctx.textAlign = 'left';
        }
        ctx.fillText(line, textX, y + index * lineHeight);
    });
};

// Helper function to draw rounded rectangle
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) {
    if (radius <= 0) {
        ctx.rect(x, y, width, height);
        return;
    }
    
    const minRadius = Math.min(width, height) / 2;
    const actualRadius = Math.min(radius, minRadius);
    
    ctx.beginPath();
    ctx.moveTo(x + actualRadius, y);
    ctx.lineTo(x + width - actualRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + actualRadius);
    ctx.lineTo(x + width, y + height - actualRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - actualRadius, y + height);
    ctx.lineTo(x + actualRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - actualRadius);
    ctx.lineTo(x, y + actualRadius);
    ctx.quadraticCurveTo(x, y, x + actualRadius, y);
    ctx.closePath();
}

const renderShape = (
    ctx: CanvasRenderingContext2D,
    element: ShapeElement,
    x: number,
    y: number,
    w: number,
    h: number,
    scale: number
) => {
    ctx.globalAlpha = element.opacity;

    if (element.shapeType === 'rectangle') {
        ctx.fillStyle = element.fillColor;
        
        // Handle rounded corners
        const cornerRadius = element.cornerRadius ? element.cornerRadius * scale : 0;
        
        if (cornerRadius > 0) {
            const strokeWidth = element.strokeWidth * scale;
            
            // Use native roundRect if available (handles stroke correctly)
            if (typeof (ctx as any).roundRect === 'function') {
                ctx.beginPath();
                (ctx as any).roundRect(x, y, w, h, cornerRadius);
                
                // Fill
                if (element.fillColor !== 'transparent') {
                    ctx.fill();
                }
                
                // Stroke
                if (element.strokeWidth > 0 && element.strokeColor !== 'transparent') {
                    ctx.strokeStyle = element.strokeColor;
                    ctx.lineWidth = strokeWidth;
                    ctx.stroke();
                }
            } else {
                // Custom implementation: use separate paths for fill and stroke
                // Fill path: full size with specified radius
                if (element.fillColor !== 'transparent') {
                    roundRect(ctx, x, y, w, h, cornerRadius);
                    ctx.fill();
                }
                
                // Stroke path: offset inward by half stroke width, with adjusted radius
                // This ensures inside and outside corners have the same visual radius
                if (element.strokeWidth > 0 && element.strokeColor !== 'transparent') {
                    const halfStroke = strokeWidth / 2;
                    const strokeX = x + halfStroke;
                    const strokeY = y + halfStroke;
                    const strokeW = w - strokeWidth;
                    const strokeH = h - strokeWidth;
                    const strokeRadius = Math.max(0, cornerRadius - halfStroke);
                    
                    ctx.strokeStyle = element.strokeColor;
                    ctx.lineWidth = strokeWidth;
                    ctx.lineJoin = 'round';
                    roundRect(ctx, strokeX, strokeY, strokeW, strokeH, strokeRadius);
                    ctx.stroke();
                }
            }
        } else {
            // Regular rectangle
            if (element.fillColor !== 'transparent') ctx.fillRect(x, y, w, h);

            if (element.strokeWidth > 0 && element.strokeColor !== 'transparent') {
                ctx.strokeStyle = element.strokeColor;
                ctx.lineWidth = element.strokeWidth * scale;
                ctx.strokeRect(x, y, w, h);
            }
        }
    } else if (element.shapeType === 'circle') {
        ctx.beginPath();
        const startAngle = 0;
        const endAngle = 2 * Math.PI;
        // Ellipse if w != h? standard arc uses radius.
        // ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle)
        const radiusX = w / 2;
        const radiusY = h / 2;
        const centerX = x + radiusX;
        const centerY = y + radiusY;

        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, startAngle, endAngle);

        if (element.fillColor !== 'transparent') {
            ctx.fillStyle = element.fillColor;
            ctx.fill();
        }

        if (element.strokeWidth > 0 && element.strokeColor !== 'transparent') {
            ctx.strokeStyle = element.strokeColor;
            ctx.lineWidth = element.strokeWidth * scale;
            ctx.stroke();
        }
    } else if (element.shapeType === 'line') {
        ctx.strokeStyle = element.strokeColor;
        ctx.lineWidth = element.strokeWidth * scale;
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w, y + h / 2);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
};

const renderPlaceholder = async (
    ctx: CanvasRenderingContext2D,
    element: PlaceholderElement,
    x: number,
    y: number,
    w: number,
    h: number,
    rowData: DataRow | any,
    scale: number
) => {
    ctx.globalAlpha = element.opacity;

    if (element.placeholderType === 'image') {
        // Determine image name: use data binding if available, otherwise use static imageName
        let imageNameToUse: string | undefined = element.imageName;
        
        if (element.imageNameBinding && element.imageNameBinding.columnId && rowData) {
            const columnValue = rowData[element.imageNameBinding.columnId];
            if (columnValue !== undefined && columnValue !== null) {
                imageNameToUse = String(columnValue);
            }
        }
        
        // If no image name, don't render anything
        if (!imageNameToUse || imageNameToUse.trim() === '') {
            ctx.globalAlpha = 1;
            return;
        }
        
        // Look up image by name
        const assets = await getAllAssets();
        const asset = assets.find(a => a.name === imageNameToUse);
        
        if (asset) {
            // Load and render the image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = asset.dataUrl;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            
            // Calculate image dimensions based on fit mode
            const imgAspect = img.width / img.height;
            const fitMode = element.imageFit || 'fitHorizontal';
            
            let drawWidth = w;
            let drawHeight = h;
            let drawX = x;
            let drawY = y;
            
            switch (fitMode) {
                case 'fitVertical':
                    // Fit to height, maintain aspect ratio, center horizontally
                    drawWidth = h * imgAspect;
                    drawHeight = h;
                    drawX = x + (w - drawWidth) / 2;
                    drawY = y;
                    break;
                case 'fitHorizontal':
                    // Fit to width, maintain aspect ratio, center vertically (default)
                    drawWidth = w;
                    drawHeight = w / imgAspect;
                    drawX = x;
                    drawY = y + (h - drawHeight) / 2;
                    break;
                case 'stretch':
                    // Fill placeholder exactly, may distort aspect ratio
                    drawWidth = w;
                    drawHeight = h;
                    drawX = x;
                    drawY = y;
                    break;
            }
            
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        } else {
            // Asset not found - don't render anything (replace with nothing)
            ctx.globalAlpha = 1;
            return;
        }
    } else if (element.placeholderType === 'qrCode') {
        // Get QR value from data binding
        let qrValue = element.displayText;
        
        if (element.qrValueBinding && element.qrValueBinding.columnId && rowData) {
            const columnValue = rowData[element.qrValueBinding.columnId];
            if (columnValue !== undefined && columnValue !== null && columnValue !== '') {
                qrValue = String(columnValue);
            } else {
                // No value in data - don't render QR code (replace with nothing)
                ctx.globalAlpha = 1;
                return;
            }
        }
        
        if (qrValue && qrValue.trim() !== '') {
            try {
                // Generate QR code
                const qrDataUrl = await QRCode.toDataURL(qrValue, {
                    width: Math.min(w, h) * 4, // Higher resolution for print
                    margin: 1,
                });
                
                const qrImg = new Image();
                qrImg.src = qrDataUrl;
                await new Promise((resolve, reject) => {
                    qrImg.onload = resolve;
                    qrImg.onerror = reject;
                });
                
                // Center QR code in placeholder
                const qrSize = Math.min(w, h);
                const qrX = x + (w - qrSize) / 2;
                const qrY = y + (h - qrSize) / 2;
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
            } catch (error) {
                console.error('Failed to generate QR code:', error);
                // Don't render anything on error (replace with nothing)
                ctx.globalAlpha = 1;
                return;
            }
        } else {
            // No QR value - don't render anything (replace with nothing)
            ctx.globalAlpha = 1;
            return;
        }
    }

    ctx.globalAlpha = 1;
};
