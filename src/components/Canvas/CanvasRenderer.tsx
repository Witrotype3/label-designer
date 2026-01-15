'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDesignStore } from '@/store/designStore';
import { mmToPx, SCREEN_DPI } from '@/lib/dimensions';
import { getLabelPosition, getLabelClipRect } from '@/lib/templates';
import type { DesignElement, TextElement, ShapeElement, ImageElement, PlaceholderElement, LabelTemplate, MasterLabel } from '@/types';
import { getAllAssets, getAsset, getAssetDataUrl, initializeAssets } from '@/lib/assets';
import QRCode from 'qrcode';
import styles from '@/styles/canvas.module.css';
import TransformControls from './TransformControls';
import { useDataStore, type DataRow } from '@/store/dataStore';

// Image cache for preloaded images
const imageCache = new Map<string, HTMLImageElement>();

export default function CanvasRenderer() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPanning, setIsPanning] = useState(false);
    const [isDraggingElement, setIsDraggingElement] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 }); // Physical start pos
    const [elementStartPos, setElementStartPos] = useState({ x: 0, y: 0 }); // Element physical pos
    const [resizeTrigger, setResizeTrigger] = useState(0);
    const [assetsCache, setAssetsCache] = useState<Map<string, { asset: any; dataUrl: string }>>(new Map());

    const {
        template,
        zoom,
        panX,
        panY,
        setPan,
        setZoom,
        getEffectiveElementsForLabel,
        getTotalLabels,
        selectedLabelIndex,
        setSelectedLabel,
        selectedElementIds,
        setSelectedElements,
        labelOverrides,
        masterLabel,
        updateMasterElement,
        updateLabelElement,
        viewMode,
        previewPageIndex,
    } = useDesignStore();

    // Data Store
    const { rows, columns } = useDataStore();

    // Calculate labels per page
    const labelsPerPage = template.rows * template.columns;

    // In preview mode, use previewPageIndex; otherwise use selectedLabelIndex or 0
    const activeRowIndex = viewMode === 'PREVIEW' ? previewPageIndex * labelsPerPage : (selectedLabelIndex !== null ? selectedLabelIndex : 0);
    const activeRow = rows[activeRowIndex];

    // Load and cache assets
    useEffect(() => {
        const loadAssets = async () => {
            try {
                await initializeAssets();
                const assets = await getAllAssets();
                const cache = new Map<string, { asset: any; dataUrl: string }>();
                
                // Pre-load data URLs for all assets
                for (const asset of assets) {
                    try {
                        const dataUrl = await getAssetDataUrl(asset);
                        cache.set(asset.name, { asset, dataUrl });
                    } catch (error) {
                        console.error(`Failed to load asset ${asset.name}:`, error);
                        // Fallback to dataUrl
                        cache.set(asset.name, { asset, dataUrl: asset.dataUrl });
                    }
                }
                
                setAssetsCache(cache);
            } catch (error) {
                console.error('Failed to load assets:', error);
            }
        };

        loadAssets();
    }, []);

    // Handle mouse wheel for zooming
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(zoom * delta);
    }, [zoom, setZoom]);

    // Handle canvas click for element selection
    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        if (isPanning || e.button === 1 || e.altKey) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        let clickedLabelIndex: number | null = null;
        let clickedElementId: string | null = null;

        if (viewMode === 'TEMPLATE') {
            // Single label view - check if click is within the centered label
            const labelWidthPx = mmToPx(template.labelWidth, SCREEN_DPI);
            const labelHeightPx = mmToPx(template.labelHeight, SCREEN_DPI);
            const canvasWidth = rect.width / zoom;
            const canvasHeight = rect.height / zoom;
            const labelX = (canvasWidth - labelWidthPx) / 2 - panX / zoom;
            const labelY = (canvasHeight - labelHeightPx) / 2 - panY / zoom;
            
            // Convert canvas coordinates to physical coordinates
            const physicalX = (canvasX - panX) / zoom;
            const physicalY = (canvasY - panY) / zoom;
            
            // Check if click is within the centered label
            if (
                physicalX >= labelX &&
                physicalX <= labelX + labelWidthPx &&
                physicalY >= labelY &&
                physicalY <= labelY + labelHeightPx
            ) {
                clickedLabelIndex = 0; // Always label 0 in template mode
                
                // Convert to label-relative coordinates
                const labelRelativeX = physicalX - labelX;
                const labelRelativeY = physicalY - labelY;
                
                // Check which element was clicked (elements are sorted by zIndex ascending, so check from end)
                const elements = getEffectiveElementsForLabel(0);
                for (let j = elements.length - 1; j >= 0; j--) {
                    const element = elements[j];
                    if (!element.visible) continue;

                    const elemX = mmToPx(element.transform.x, SCREEN_DPI);
                    const elemY = mmToPx(element.transform.y, SCREEN_DPI);
                    const elemWidth = mmToPx(element.transform.width, SCREEN_DPI);
                    const elemHeight = mmToPx(element.transform.height, SCREEN_DPI);

                    if (
                        labelRelativeX >= elemX &&
                        labelRelativeX <= elemX + elemWidth &&
                        labelRelativeY >= elemY &&
                        labelRelativeY <= elemY + elemHeight
                    ) {
                        clickedElementId = element.id;
                        break;
                    }
                }
            }
        } else {
            // PREVIEW mode - check all labels
            const physicalX = (canvasX - panX) / zoom;
            const physicalY = (canvasY - panY) / zoom;

            const totalLabels = getTotalLabels();
            // Calculate absolute label index: pageIndex * labelsPerPage + labelIndexOnPage
            for (let i = 0; i < totalLabels; i++) {
                const position = getLabelPosition(template, i);
                if (!position) continue;

                const labelX = mmToPx(position.x, SCREEN_DPI);
                const labelY = mmToPx(position.y, SCREEN_DPI);
                const labelWidth = mmToPx(template.labelWidth, SCREEN_DPI);
                const labelHeight = mmToPx(template.labelHeight, SCREEN_DPI);

                // Check if click is within this label
                if (
                    physicalX >= labelX &&
                    physicalX <= labelX + labelWidth &&
                    physicalY >= labelY &&
                    physicalY <= labelY + labelHeight
                ) {
                    // Calculate absolute label index across all pages
                    const absoluteLabelIndex = previewPageIndex * labelsPerPage + i;
                    clickedLabelIndex = absoluteLabelIndex;

                    // Convert to label-relative coordinates
                    const labelRelativeX = physicalX - labelX;
                    const labelRelativeY = physicalY - labelY;

                    // Check which element was clicked (elements are sorted by zIndex ascending, so check from end)
                    // Use absolute label index to get correct overrides
                    const elements = getEffectiveElementsForLabel(absoluteLabelIndex);
                    for (let j = elements.length - 1; j >= 0; j--) {
                        const element = elements[j];
                        if (!element.visible) continue;

                        const elemX = mmToPx(element.transform.x, SCREEN_DPI);
                        const elemY = mmToPx(element.transform.y, SCREEN_DPI);
                        const elemWidth = mmToPx(element.transform.width, SCREEN_DPI);
                        const elemHeight = mmToPx(element.transform.height, SCREEN_DPI);

                        if (
                            labelRelativeX >= elemX &&
                            labelRelativeX <= elemX + elemWidth &&
                            labelRelativeY >= elemY &&
                            labelRelativeY <= elemY + elemHeight
                        ) {
                            clickedElementId = element.id;
                            break;
                        }
                    }
                    break;
                }
            }
        }

        // Update selection
        // Always set label index first if we found one, even if no element was clicked
        if (clickedLabelIndex !== null) {
            setSelectedLabel(clickedLabelIndex);
        }
        
        if (clickedElementId) {
            setSelectedElements([clickedElementId]);
            // Ensure label index is set when element is selected
            if (clickedLabelIndex === null && viewMode === 'PREVIEW') {
                // If we clicked an element but didn't set label index, try to find which label it belongs to
                // This shouldn't happen, but add as safety
                const totalLabels = getTotalLabels();
                for (let i = 0; i < totalLabels; i++) {
                    const absoluteLabelIndex = previewPageIndex * labelsPerPage + i;
                    const elements = getEffectiveElementsForLabel(absoluteLabelIndex);
                    if (elements.some(el => el.id === clickedElementId)) {
                        setSelectedLabel(absoluteLabelIndex);
                        break;
                    }
                }
            }
        } else {
            setSelectedElements([]);
        }
    }, [
        isPanning,
        panX,
        panY,
        zoom,
        viewMode,
        getTotalLabels,
        template,
        getEffectiveElementsForLabel,
        setSelectedElements,
        setSelectedLabel,
        previewPageIndex,
        labelsPerPage,
    ]);

    // Handle mouse down for panning or moving
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            // Middle mouse or Alt+Left mouse -> Pan
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
            e.preventDefault();
        } else if (e.button === 0 && selectedElementIds.length === 1) {
            // Left click -> Check if hitting selected element to Drag
            const rect = canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            const physicalX = (canvasX - panX) / zoom;
            const physicalY = (canvasY - panY) / zoom;

            // Check if we hit the selected element
            const elementId = selectedElementIds[0];
            const element = masterLabel.elements.find(el => el.id === elementId);

            if (element) {
                let absElemX: number;
                let absElemY: number;
                let elemWidth: number;
                let elemHeight: number;
                
                if (viewMode === 'TEMPLATE') {
                    // In single label view, elements are in label-local coordinates
                    // Convert physical coordinates to label-local
                    const labelWidthPx = mmToPx(template.labelWidth, SCREEN_DPI);
                    const labelHeightPx = mmToPx(template.labelHeight, SCREEN_DPI);
                    const canvasWidth = rect.width / zoom;
                    const canvasHeight = rect.height / zoom;
                    const labelX = (canvasWidth - labelWidthPx) / 2 - panX / zoom;
                    const labelY = (canvasHeight - labelHeightPx) / 2 - panY / zoom;
                    
                    const labelRelativeX = physicalX - labelX;
                    const labelRelativeY = physicalY - labelY;
                    
                    // Convert to mm
                    const pxToMm = (px: number) => (px * 25.4) / SCREEN_DPI;
                    absElemX = pxToMm(labelRelativeX);
                    absElemY = pxToMm(labelRelativeY);
                    elemWidth = element.transform.width;
                    elemHeight = element.transform.height;
                } else {
                    // In preview mode, need label position
                    if (selectedLabelIndex === null) return;
                    const labelPos = getLabelPosition(template, selectedLabelIndex);
                    if (!labelPos) return;
                    const pxToMm = (px: number) => (px * 25.4) / SCREEN_DPI;
                    absElemX = labelPos.x + element.transform.x;
                    absElemY = labelPos.y + element.transform.y;
                    elemWidth = element.transform.width;
                    elemHeight = element.transform.height;
                }

                if (
                    absElemX >= element.transform.x &&
                    absElemX <= element.transform.x + elemWidth &&
                    absElemY >= element.transform.y &&
                    absElemY <= element.transform.y + elemHeight
                ) {
                    setIsDraggingElement(true);
                    setLastMousePos({ x: e.clientX, y: e.clientY });
                    setDragStartPos({ x: e.clientX, y: e.clientY });
                    setElementStartPos({ x: element.transform.x, y: element.transform.y });
                }
            }
        }
    }, [masterLabel, template, selectedElementIds, selectedLabelIndex, panX, panY, zoom, viewMode]);

    // Handle mouse move for panning or moving
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setPan(panX + dx, panY + dy);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        } else if (isDraggingElement && selectedElementIds.length === 1) {
            const elementId = selectedElementIds[0];
            
            // Calculate total delta from drag start (more accurate than incremental updates)
            const totalDxPx = e.clientX - dragStartPos.x;
            const totalDyPx = e.clientY - dragStartPos.y;

            // Convert pixels to mm
            const totalDxMm = (totalDxPx / zoom / SCREEN_DPI) * 25.4;
            const totalDyMm = (totalDyPx / zoom / SCREEN_DPI) * 25.4;

            // Update element position based on start position + total delta
            updateMasterElement(elementId, {
                transform: {
                    ...masterLabel.elements.find(el => el.id === elementId)!.transform,
                    x: elementStartPos.x + totalDxMm,
                    y: elementStartPos.y + totalDyMm,
                }
            });

            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    }, [isPanning, isDraggingElement, lastMousePos, panX, panY, setPan, zoom, selectedElementIds, updateMasterElement, masterLabel]);

    // Handle mouse up
    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        setIsDraggingElement(false);
    }, []);

    // Add wheel event listener
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    // Render canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to container size if not matching (though ResizeObserver handles dynamic updates)
        const rect = container.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context
        ctx.save();

        // Apply zoom and pan
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        // In TEMPLATE mode, show only one label centered. In PREVIEW mode, show full sheet.
        if (viewMode === 'TEMPLATE') {
            // Single label view - center it on canvas
            const labelWidthPx = mmToPx(template.labelWidth, SCREEN_DPI);
            const labelHeightPx = mmToPx(template.labelHeight, SCREEN_DPI);
            
            // Calculate center position (accounting for zoom and pan)
            const canvasWidth = canvas.width / zoom;
            const canvasHeight = canvas.height / zoom;
            const labelX = (canvasWidth - labelWidthPx) / 2 - panX / zoom;
            const labelY = (canvasHeight - labelHeightPx) / 2 - panY / zoom;
            
            // Draw background (light gray to show it's a single label view)
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            
            // Render only the first label (label index 0) at the center
            ctx.save();
            ctx.translate(labelX, labelY);
            
            // Draw label background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, labelWidthPx, labelHeightPx);
            
            // Draw label border
            const isSelected = selectedLabelIndex === 0;
            const hasOverride = labelOverrides.has(0);
            
            if (isSelected) {
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 2 / zoom;
            } else if (hasOverride) {
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1 / zoom;
            } else {
                ctx.strokeStyle = '#d0d0d0';
                ctx.lineWidth = 1 / zoom;
            }
            ctx.strokeRect(0, 0, labelWidthPx, labelHeightPx);
            
            // Draw override indicator
            if (hasOverride) {
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(labelWidthPx - 8 / zoom, 8 / zoom, 4 / zoom, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Render elements for label 0
            const elements = getEffectiveElementsForLabel(0);
            for (const element of elements) {
                if (element.visible) {
                    renderElement(ctx, element);
                }
            }
            
            ctx.restore();
        } else {
            // PREVIEW mode - show full sheet with all labels
            const sheetWidthPx = mmToPx(template.sheetConfig.width, SCREEN_DPI);
            const sheetHeightPx = mmToPx(template.sheetConfig.height, SCREEN_DPI);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, sheetWidthPx, sheetHeightPx);
            ctx.strokeStyle = '#999999';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, sheetWidthPx, sheetHeightPx);

            // Render all labels - each label uses a different data row based on page
            const totalLabels = getTotalLabels();
            for (let i = 0; i < totalLabels; i++) {
                // Calculate absolute label index across all pages (for override lookup)
                const absoluteLabelIndex = previewPageIndex * labelsPerPage + i;
                // Calculate which row this label should use
                const rowIndex = absoluteLabelIndex;
                const labelRowData = rowIndex < rows.length ? rows[rowIndex] : undefined;
                // Pass both sheet-relative index (i) for position/clipping and absolute index for overrides
                renderLabel(ctx, i, labelRowData, absoluteLabelIndex);
            }
        }

        // Restore context
        ctx.restore();
    }, [template, zoom, panX, panY, getTotalLabels, selectedLabelIndex, labelOverrides, selectedElementIds, masterLabel, resizeTrigger, viewMode, rows, activeRowIndex, previewPageIndex, labelsPerPage, getEffectiveElementsForLabel]);

    // Handle container resize
    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        // Function to update dimensions
        const updateDimensions = () => {
            if (!container || !canvas) return;
            const rect = container.getBoundingClientRect();

            // Only update if dimensions changed to avoid infinite loops, 
            // but ensure we update if it's currently 300x150 (default)
            // Use local vars for comparison to avoid react state lag
            if (canvas.width !== rect.width || canvas.height !== rect.height) {
                canvas.width = rect.width;
                canvas.height = rect.height;
                setResizeTrigger(prev => prev + 1);
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            // Use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded" 
            // and ensure we are in a good render frame
            window.requestAnimationFrame(updateDimensions);
        });

        resizeObserver.observe(container);

        // Initial check
        updateDimensions();

        // Backup check for race conditions
        const timeoutId = setTimeout(updateDimensions, 100);

        return () => {
            resizeObserver.disconnect();
            clearTimeout(timeoutId);
        };
    }, []);



    const renderLabel = (ctx: CanvasRenderingContext2D, labelIndex: number, rowData?: DataRow, absoluteLabelIndex?: number) => {
        // labelIndex is sheet-relative (0 to labelsPerPage-1) for position/clipping
        // absoluteLabelIndex is across all pages (for override lookup)
        const position = getLabelPosition(template, labelIndex);
        if (!position) return;

        const x = mmToPx(position.x, SCREEN_DPI);
        const y = mmToPx(position.y, SCREEN_DPI);
        const width = mmToPx(template.labelWidth, SCREEN_DPI);
        const height = mmToPx(template.labelHeight, SCREEN_DPI);

        // Use absolute label index for override lookup if provided, otherwise use sheet-relative index
        const overrideLabelIndex = absoluteLabelIndex !== undefined ? absoluteLabelIndex : labelIndex;

        // Draw label background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, width, height);

        // Draw label border
        const isSelected = selectedLabelIndex === overrideLabelIndex;
        const hasOverride = labelOverrides.has(overrideLabelIndex);

        if (isSelected) {
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
        } else if (hasOverride) {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1;
        } else {
            ctx.strokeStyle = '#d0d0d0';
            ctx.lineWidth = 1;
        }
        ctx.strokeRect(x, y, width, height);

        // Draw override indicator
        if (hasOverride) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(x + width - 8, y + 8, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Render elements - use absolute label index for override lookup
        const elements = getEffectiveElementsForLabel(overrideLabelIndex);
        ctx.save();
        
        // Apply smart clipping in PREVIEW mode only - use sheet-relative index for position
        if (viewMode === 'PREVIEW') {
            const clipRect = getLabelClipRect(template, labelIndex);
            if (clipRect) {
                // Convert clip rect from mm to pixels
                const clipX = mmToPx(clipRect.x, SCREEN_DPI);
                const clipY = mmToPx(clipRect.y, SCREEN_DPI);
                const clipWidth = mmToPx(clipRect.width, SCREEN_DPI);
                const clipHeight = mmToPx(clipRect.height, SCREEN_DPI);
                
                // Set clipping path
                ctx.beginPath();
                ctx.rect(clipX, clipY, clipWidth, clipHeight);
                ctx.clip();
            }
        }
        
        ctx.translate(x, y);

        for (const element of elements) {
            if (element.visible) {
                renderElement(ctx, element, rowData);
            }
        }

        ctx.restore();
    };

    const renderElement = (ctx: CanvasRenderingContext2D, element: DesignElement, rowData?: DataRow) => {
        const x = mmToPx(element.transform.x, SCREEN_DPI);
        const y = mmToPx(element.transform.y, SCREEN_DPI);
        const width = mmToPx(element.transform.width, SCREEN_DPI);
        const height = mmToPx(element.transform.height, SCREEN_DPI);

        ctx.save();

        // Apply rotation
        if (element.transform.rotation !== 0) {
            ctx.translate(x + width / 2, y + height / 2);
            ctx.rotate((element.transform.rotation * Math.PI) / 180);
            ctx.translate(-(x + width / 2), -(y + height / 2));
        }

        // Use provided rowData, or fall back to activeRow
        const dataRow = rowData || activeRow;

        // Render based on type
        switch (element.type) {
            case 'text':
                renderTextElement(ctx, element as TextElement, x, y, width, height, dataRow);
                break;
            case 'shape':
                renderShapeElement(ctx, element as ShapeElement, x, y, width, height);
                break;
            case 'image':
                renderImageElement(ctx, element as ImageElement, x, y, width, height);
                break;
            case 'placeholder':
                renderPlaceholderElement(ctx, element as PlaceholderElement, x, y, width, height, dataRow);
                break;
        }

        // Draw selection outline
        if (selectedElementIds.includes(element.id)) {
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
            ctx.setLineDash([]);
        }

        ctx.restore();
    };

    const renderTextElement = (
        ctx: CanvasRenderingContext2D,
        element: TextElement,
        x: number,
        y: number,
        width: number,
        height: number,
        rowData?: DataRow
    ) => {
        ctx.fillStyle = element.color;
        ctx.font = `${element.fontStyle} ${element.fontWeight} ${element.fontSize}pt ${element.fontFamily}`;
        ctx.textBaseline = 'top';

        // Variable substitution logic - works in both TEMPLATE and PREVIEW modes
        let displayContent = element.content;

        // Use provided rowData, or fall back to activeRow
        const dataRow = rowData || activeRow;
        if (dataRow) {
            // First, check if there's a binding for content
            const contentBinding = element.bindings?.find(b => b.property === 'content');
            if (contentBinding && contentBinding.columnId) {
                // Use bound column value
                const boundValue = dataRow[contentBinding.columnId];
                if (boundValue !== undefined && boundValue !== null && boundValue !== '') {
                    displayContent = String(boundValue);
                } else {
                    // No value - replace with empty string
                    displayContent = '';
                }
            } else {
                // Fall back to {variable} syntax
                displayContent = displayContent.replace(/\{([^}]+)\}/g, (match, key) => {
                    const cleanKey = key.trim();
                    
                    // First, try to find column by name (case-insensitive)
                    const column = columns.find(c => c.name.toLowerCase() === cleanKey.toLowerCase());
                    if (column) {
                        // Use column ID to access row data
                        const value = dataRow[column.id];
                        if (value !== undefined && value !== null) {
                            return String(value);
                        }
                    }
                    
                    // Fall back to direct key matching for backward compatibility
                    const rowKey = Object.keys(dataRow).find(k => k.toLowerCase() === cleanKey.toLowerCase());
                    if (rowKey && dataRow[rowKey] !== undefined && dataRow[rowKey] !== null) {
                        return String(dataRow[rowKey]);
                    }
                    
                    return match; // Return original if not found
                });
            }
        }

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
        const manualLines = displayContent.split('\n');
        const allLines: string[] = [];
        
        manualLines.forEach(line => {
            const wrapped = wrapText(line, width);
            allLines.push(...wrapped);
        });

        const lineHeight = element.fontSize * element.lineHeight * 1.33; // pt to px approximation

        allLines.forEach((line, index) => {
            let textX = x;
            if (element.textAlign === 'center') {
                ctx.textAlign = 'center';
                textX = x + width / 2;
            } else if (element.textAlign === 'right') {
                ctx.textAlign = 'right';
                textX = x + width;
            } else {
                ctx.textAlign = 'left';
            }

            ctx.fillText(line, textX, y + index * lineHeight);
        });
    };

    const renderShapeElement = (
        ctx: CanvasRenderingContext2D,
        element: ShapeElement,
        x: number,
        y: number,
        width: number,
        height: number
    ) => {
        ctx.globalAlpha = element.opacity;

        if (element.shapeType === 'rectangle') {
            // Fill and stroke together for rounded rectangles to ensure consistent corner radius
            if (element.cornerRadius) {
                const radius = mmToPx(element.cornerRadius, SCREEN_DPI);
                const strokeWidth = mmToPx(element.strokeWidth, SCREEN_DPI);
                
                // Use native roundRect if available (handles stroke correctly)
                if (typeof (ctx as any).roundRect === 'function') {
                    ctx.beginPath();
                    (ctx as any).roundRect(x, y, width, height, radius);
                    
                    // Fill
                    if (element.fillColor !== 'transparent') {
                        ctx.fillStyle = element.fillColor;
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
                        ctx.fillStyle = element.fillColor;
                        roundRect(ctx, x, y, width, height, radius);
                        ctx.fill();
                    }
                    
                    // Stroke path: offset inward by half stroke width, with adjusted radius
                    // This ensures inside and outside corners have the same visual radius
                    if (element.strokeWidth > 0 && element.strokeColor !== 'transparent') {
                        const halfStroke = strokeWidth / 2;
                        const strokeX = x + halfStroke;
                        const strokeY = y + halfStroke;
                        const strokeWidth_adj = width - strokeWidth;
                        const strokeHeight_adj = height - strokeWidth;
                        const strokeRadius = Math.max(0, radius - halfStroke);
                        
                        ctx.strokeStyle = element.strokeColor;
                        ctx.lineWidth = strokeWidth;
                        ctx.lineJoin = 'round';
                        roundRect(ctx, strokeX, strokeY, strokeWidth_adj, strokeHeight_adj, strokeRadius);
                        ctx.stroke();
                    }
                }
            } else {
                // Regular rectangle
                if (element.fillColor !== 'transparent') {
                    ctx.fillStyle = element.fillColor;
                    ctx.fillRect(x, y, width, height);
                }
                
                if (element.strokeWidth > 0 && element.strokeColor !== 'transparent') {
                    ctx.strokeStyle = element.strokeColor;
                    ctx.lineWidth = mmToPx(element.strokeWidth, SCREEN_DPI);
                    ctx.strokeRect(x, y, width, height);
                }
            }
        } else if (element.shapeType === 'circle') {
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            const radius = Math.min(width, height) / 2;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

            ctx.fillStyle = element.fillColor;
            ctx.fill();

            if (element.strokeWidth > 0) {
                ctx.strokeStyle = element.strokeColor;
                ctx.lineWidth = mmToPx(element.strokeWidth, SCREEN_DPI);
                ctx.stroke();
            }
        } else if (element.shapeType === 'line') {
            ctx.strokeStyle = element.strokeColor;
            ctx.lineWidth = mmToPx(element.strokeWidth, SCREEN_DPI);
            ctx.beginPath();
            ctx.moveTo(x, y + height / 2);
            ctx.lineTo(x + width, y + height / 2);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    };

    const renderImageElement = (
        ctx: CanvasRenderingContext2D,
        element: ImageElement,
        x: number,
        y: number,
        width: number,
        height: number
    ) => {
        // Get or create cached image
        let img = imageCache.get(element.src);
        
        if (!img) {
            img = new Image();
            img.crossOrigin = 'anonymous';
            imageCache.set(element.src, img);
            img.src = element.src;
        }

        // If image is loaded, draw it
        if (img.complete && img.naturalWidth > 0) {
            try {
                // Calculate crop area
                const cropX = element.cropX * element.originalWidth;
                const cropY = element.cropY * element.originalHeight;
                const cropWidth = element.cropWidth * element.originalWidth;
                const cropHeight = element.cropHeight * element.originalHeight;

                // Draw image with cropping
                ctx.drawImage(
                    img,
                    cropX, cropY, cropWidth, cropHeight, // Source rectangle
                    x, y, width, height // Destination rectangle
                );
            } catch (error) {
                // Fallback to placeholder on draw error
                drawImagePlaceholder(ctx, x, y, width, height, true);
            }
        } else {
            // Show placeholder while loading
            drawImagePlaceholder(ctx, x, y, width, height, false);
            
            // Trigger re-render when image loads
            img.onload = () => {
                setResizeTrigger(prev => prev + 1);
            };
            img.onerror = () => {
                setResizeTrigger(prev => prev + 1);
            };
        }
    };

    const renderPlaceholderElement = (
        ctx: CanvasRenderingContext2D,
        element: PlaceholderElement,
        x: number,
        y: number,
        width: number,
        height: number,
        rowData?: DataRow
    ) => {
        ctx.globalAlpha = element.opacity;

        // Use provided rowData, or fall back to activeRow
        const dataRow = rowData || activeRow;

        if (element.placeholderType === 'image') {
            // Determine image name: use data binding if available, otherwise use static imageName
            let imageNameToUse: string | undefined = element.imageName;
            
            if (element.imageNameBinding && element.imageNameBinding.columnId && dataRow) {
                const columnValue = dataRow[element.imageNameBinding.columnId];
                if (columnValue !== undefined && columnValue !== null) {
                    imageNameToUse = String(columnValue);
                }
            }
            
            // Look up image by name from cache
            const cachedAsset = imageNameToUse ? assetsCache.get(imageNameToUse) : undefined;
            
            if (cachedAsset) {
                const { asset, dataUrl } = cachedAsset;
                // Render the actual image
                let img = imageCache.get(dataUrl);
                if (!img) {
                    img = new Image();
                    img.crossOrigin = 'anonymous';
                    imageCache.set(dataUrl, img);
                    img.src = dataUrl;
                }
                
                if (img.complete && img.naturalWidth > 0) {
                    // Calculate image dimensions based on fit mode
                    const imgAspect = img.width / img.height;
                    const fitMode = element.imageFit || 'fitHorizontal';
                    
                    let drawWidth = width;
                    let drawHeight = height;
                    let drawX = x;
                    let drawY = y;
                    
                    switch (fitMode) {
                        case 'fitVertical':
                            // Fit to height, maintain aspect ratio, center horizontally
                            drawWidth = height * imgAspect;
                            drawHeight = height;
                            drawX = x + (width - drawWidth) / 2;
                            drawY = y;
                            break;
                        case 'fitHorizontal':
                            // Fit to width, maintain aspect ratio, center vertically (default)
                            drawWidth = width;
                            drawHeight = width / imgAspect;
                            drawX = x;
                            drawY = y + (height - drawHeight) / 2;
                            break;
                        case 'stretch':
                            // Fill placeholder exactly, may distort aspect ratio
                            drawWidth = width;
                            drawHeight = height;
                            drawX = x;
                            drawY = y;
                            break;
                    }
                    
                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                } else {
                    // Still loading - show placeholder
                    drawPlaceholderBox(ctx, element, x, y, width, height);
                    // Trigger re-render when image loads
                    img.onload = () => {
                        setResizeTrigger(prev => prev + 1);
                    };
                    img.onerror = () => {
                        setResizeTrigger(prev => prev + 1);
                    };
                }
            } else {
                // Asset not found - don't render anything (replace with nothing)
                ctx.globalAlpha = 1;
                return;
            }
        } else if (element.placeholderType === 'qrCode') {
            // Get QR value from data binding
            let qrValue = element.displayText;
            const hasBinding = !!(element.qrValueBinding && element.qrValueBinding.columnId && dataRow);
            
            if (element.qrValueBinding && element.qrValueBinding.columnId && dataRow) {
                const columnValue = dataRow[element.qrValueBinding.columnId];
                if (columnValue !== undefined && columnValue !== null) {
                    qrValue = String(columnValue);
                }
            }
            
            // Generate QR code if we have a value (either from binding or displayText)
            // If bound to data, always generate; if not bound, only generate if value differs from displayText
            const shouldGenerate = qrValue && (hasBinding || qrValue !== element.displayText);
            
            if (shouldGenerate) {
                // Generate QR code asynchronously
                QRCode.toDataURL(qrValue, {
                    width: Math.min(width, height) * 4, // Higher resolution
                    margin: 1,
                }).then(qrDataUrl => {
                    const qrImg = new Image();
                    qrImg.src = qrDataUrl;
                    qrImg.onload = () => {
                        // Store QR code in cache for next render
                        const cacheKey = `qr_${qrValue}`;
                        imageCache.set(cacheKey, qrImg);
                        setResizeTrigger(prev => prev + 1);
                    };
                }).catch(error => {
                    console.error('Failed to generate QR code:', error);
                    // Don't render anything on error (replace with nothing)
                    ctx.globalAlpha = 1;
                    return;
                });
                
                // Check if QR code is already cached
                const cacheKey = `qr_${qrValue}`;
                const cachedQr = imageCache.get(cacheKey);
                if (cachedQr && cachedQr.complete) {
                    const qrSize = Math.min(width, height);
                    const qrX = x + (width - qrSize) / 2;
                    const qrY = y + (height - qrSize) / 2;
                    ctx.drawImage(cachedQr, qrX, qrY, qrSize, qrSize);
                } else {
                    // Show placeholder while generating (async operation)
                    drawPlaceholderBox(ctx, element, x, y, width, height);
                }
            } else {
                // No QR value - don't render anything (replace with nothing)
                ctx.globalAlpha = 1;
                return;
            }
        }

        ctx.globalAlpha = 1;
    };

    const drawPlaceholderBox = (
        ctx: CanvasRenderingContext2D,
        element: PlaceholderElement,
        x: number,
        y: number,
        width: number,
        height: number,
        hasError = false
    ) => {
        // Draw placeholder rectangle
        ctx.fillStyle = element.fillColor;
        ctx.fillRect(x, y, width, height);
        
        ctx.strokeStyle = hasError ? '#ff0000' : element.strokeColor;
        ctx.lineWidth = element.strokeWidth;
        ctx.strokeRect(x, y, width, height);
        
        // Draw text
        ctx.fillStyle = hasError ? '#ff0000' : '#666666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = hasError ? 'Not Found' : element.displayText;
        ctx.fillText(text, x + width / 2, y + height / 2);
    };

    const drawImagePlaceholder = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        isError: boolean
    ) => {
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#999999';
        ctx.strokeRect(x, y, width, height);

        // Draw icon
        ctx.fillStyle = isError ? '#ff0000' : '#666666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isError ? '⚠' : '🖼️', x + width / 2, y + height / 2);
    };

    // Helper function for rounded rectangles
    const roundRect = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
    ) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    };

    return (
        <div ref={containerRef} className={styles.canvasContainer}>
            <div
                className={`${styles.canvasWrapper} ${isPanning ? styles.panning : ''}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleCanvasClick}
            >
                <canvas ref={canvasRef} className={styles.canvas} />

                {/* Transform Controls */}
                {selectedElementIds.length === 1 && (
                    <RenderTransformControls
                        selectedId={selectedElementIds[0]}
                        masterLabel={masterLabel}
                        template={template}
                        selectedLabelIndex={selectedLabelIndex}
                        zoom={zoom}
                        panX={panX}
                        panY={panY}
                        viewMode={viewMode}
                        updateMasterElement={updateMasterElement}
                        updateLabelElement={updateLabelElement}
                        getEffectiveElementsForLabel={getEffectiveElementsForLabel}
                    />
                )}
            </div>

            {/* Zoom Controls */}
            <div className={styles.zoomControls}>
                <button className="btn btn-icon btn-ghost" onClick={() => setZoom(zoom * 1.2)}>
                    +
                </button>
                <div className={styles.zoomDisplay}>{Math.round(zoom * 100)}%</div>
                <button className="btn btn-icon btn-ghost" onClick={() => setZoom(zoom / 1.2)}>
                    −
                </button>
            </div>
        </div>
    );
}

// Helper component to avoid heavy logic inside the main render return
function RenderTransformControls({
    selectedId,
    masterLabel,
    template,
    selectedLabelIndex,
    zoom,
    panX,
    panY,
    viewMode,
    updateMasterElement,
    updateLabelElement,
    getEffectiveElementsForLabel
}: {
    selectedId: string;
    masterLabel: MasterLabel;
    template: LabelTemplate;
    selectedLabelIndex: number | null;
    zoom: number;
    panX: number;
    panY: number;
    viewMode: 'TEMPLATE' | 'PREVIEW';
    updateMasterElement: (elementId: string, updates: Partial<DesignElement>) => void;
    updateLabelElement: (labelIndex: number, elementId: string, updates: Partial<DesignElement>) => void;
    getEffectiveElementsForLabel: (labelIndex: number) => DesignElement[];
}) {
    // Get the effective element (with overrides applied) when in preview mode with label selected
    // Otherwise, get from master label
    let element: DesignElement | undefined;
    if (viewMode === 'PREVIEW' && selectedLabelIndex !== null) {
        const effectiveElements = getEffectiveElementsForLabel(selectedLabelIndex);
        element = effectiveElements.find(el => el.id === selectedId);
    } else {
        element = masterLabel.elements.find((el: DesignElement) => el.id === selectedId);
    }
    
    if (!element) return null;

    let containerOffset: { x: number; y: number };
    
    if (viewMode === 'TEMPLATE') {
        // In single label view, elements are relative to label 0 at (0, 0)
        // But we need to account for the centered position on screen
        // TransformControls expects containerOffset in mm, not pixels
        const labelWidthPx = mmToPx(template.labelWidth, SCREEN_DPI);
        const labelHeightPx = mmToPx(template.labelHeight, SCREEN_DPI);
        // Calculate where the label is positioned on screen (centered) in pixels
        const canvas = document.querySelector('canvas');
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const canvasWidth = rect.width / zoom;
        const canvasHeight = rect.height / zoom;
        const labelXPx = (canvasWidth - labelWidthPx) / 2 - panX / zoom;
        const labelYPx = (canvasHeight - labelHeightPx) / 2 - panY / zoom;
        // Convert pixels to mm
        const pxToMm = (px: number) => (px * 25.4) / SCREEN_DPI;
        containerOffset = { x: pxToMm(labelXPx), y: pxToMm(labelYPx) };
    } else {
        // In preview mode, use actual label position
        const labelIndex = selectedLabelIndex !== null ? selectedLabelIndex : 0;
        const labelPos = getLabelPosition(template, labelIndex);
        if (!labelPos) return null;
        containerOffset = labelPos;
    }

    const handleUpdate = (updates: Partial<DesignElement>) => {
        if (viewMode === 'PREVIEW' && selectedLabelIndex !== null) {
            // In preview mode with label selected, update label-specific override
            updateLabelElement(selectedLabelIndex, element.id, updates);
        } else {
            // In template mode, update master label
            updateMasterElement(element.id, updates);
        }
    };

    return (
        <TransformControls
            element={element}
            zoom={zoom}
            panX={panX}
            panY={panY}
            dpi={SCREEN_DPI}
            containerOffset={containerOffset}
            onUpdate={handleUpdate}
        />
    );
}
