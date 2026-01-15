/**
 * Label Template Library
 * 
 * Predefined templates for common label formats (Avery and custom)
 */

import type { LabelTemplate, SheetConfig } from '@/types';

// ============================================================================
// Standard Sheet Configurations
// ============================================================================

export const SHEET_LETTER_PORTRAIT: SheetConfig = {
    pageSize: 'Letter',
    orientation: 'portrait',
    width: 215.9,
    height: 279.4,
    marginTop: 12.7,
    marginRight: 12.7,
    marginBottom: 12.7,
    marginLeft: 12.7,
};

export const SHEET_LETTER_LANDSCAPE: SheetConfig = {
    pageSize: 'Letter',
    orientation: 'landscape',
    width: 279.4,
    height: 215.9,
    marginTop: 12.7,
    marginRight: 12.7,
    marginBottom: 12.7,
    marginLeft: 12.7,
};

export const SHEET_A4_PORTRAIT: SheetConfig = {
    pageSize: 'A4',
    orientation: 'portrait',
    width: 210,
    height: 297,
    marginTop: 12.7,
    marginRight: 12.7,
    marginBottom: 12.7,
    marginLeft: 12.7,
};

// ============================================================================
// Avery Templates
// ============================================================================

export const AVERY_5160: LabelTemplate = {
    id: 'avery-5160',
    name: 'Avery 5160',
    description: 'Address Labels (1" × 2-5/8")',
    rows: 10,
    columns: 3,
    labelWidth: 66.675, // 2.625 inches
    labelHeight: 25.4, // 1 inch
    horizontalSpacing: 3.175, // 0.125 inches
    verticalSpacing: 0,
    offsetTop: 12.7, // 0.5 inches
    offsetLeft: 4.7625, // 0.1875 inches
    sheetConfig: SHEET_LETTER_PORTRAIT,
};

export const AVERY_5161: LabelTemplate = {
    id: 'avery-5161',
    name: 'Avery 5161',
    description: 'Address Labels (1" × 4")',
    rows: 10,
    columns: 2,
    labelWidth: 101.6, // 4 inches
    labelHeight: 25.4, // 1 inch
    horizontalSpacing: 3.175, // 0.125 inches
    verticalSpacing: 0,
    offsetTop: 12.7, // 0.5 inches
    offsetLeft: 4.7625, // 0.1875 inches
    sheetConfig: SHEET_LETTER_PORTRAIT,
};

export const AVERY_5163: LabelTemplate = {
    id: 'avery-5163',
    name: 'Avery 5163',
    description: 'Shipping Labels (2" × 4")',
    rows: 5,
    columns: 2,
    labelWidth: 101.6, // 4 inches
    labelHeight: 50.8, // 2 inches
    horizontalSpacing: 3.175, // 0.125 inches
    verticalSpacing: 0,
    offsetTop: 12.7, // 0.5 inches
    offsetLeft: 4.7625, // 0.1875 inches
    sheetConfig: SHEET_LETTER_PORTRAIT,
};

export const AVERY_5164: LabelTemplate = {
    id: 'avery-5164',
    name: 'Avery 5164',
    description: 'Shipping Labels (3-1/3" × 4")',
    rows: 3,
    columns: 2,
    labelWidth: 101.6, // 4 inches
    labelHeight: 84.667, // 3.333 inches
    horizontalSpacing: 3.175, // 0.125 inches
    verticalSpacing: 0,
    offsetTop: 12.7, // 0.5 inches
    offsetLeft: 4.7625, // 0.1875 inches
    sheetConfig: SHEET_LETTER_PORTRAIT,
};

export const AVERY_5167: LabelTemplate = {
    id: 'avery-5167',
    name: 'Avery 5167',
    description: 'Return Address Labels (1/2" × 1-3/4")',
    rows: 20,
    columns: 4,
    labelWidth: 44.45, // 1.75 inches
    labelHeight: 12.7, // 0.5 inches
    horizontalSpacing: 3.175, // 0.125 inches
    verticalSpacing: 0,
    offsetTop: 12.7, // 0.5 inches
    offsetLeft: 4.7625, // 0.1875 inches
    sheetConfig: SHEET_LETTER_PORTRAIT,
};

export const AVERY_8160: LabelTemplate = {
    id: 'avery-8160',
    name: 'Avery 8160',
    description: 'Address Labels (1" × 2-5/8") - Same as 5160',
    rows: 10,
    columns: 3,
    labelWidth: 66.675,
    labelHeight: 25.4,
    horizontalSpacing: 3.175,
    verticalSpacing: 0,
    offsetTop: 12.7,
    offsetLeft: 4.7625,
    sheetConfig: SHEET_LETTER_PORTRAIT,
};

export const AVERY_8163: LabelTemplate = {
    id: 'avery-8163',
    name: 'Avery 8163',
    description: 'Shipping Labels (2" × 4") - Same as 5163',
    rows: 5,
    columns: 2,
    labelWidth: 101.6,
    labelHeight: 50.8,
    horizontalSpacing: 3.175,
    verticalSpacing: 0,
    offsetTop: 12.7,
    offsetLeft: 4.7625,
    sheetConfig: SHEET_LETTER_PORTRAIT,
};

export const AVERY_8460: LabelTemplate = {
    id: 'avery-8460',
    name: 'Avery 8460',
    description: 'Address Labels (1" × 2-5/8") - Inkjet',
    rows: 10,
    columns: 3,
    labelWidth: 66.675,
    labelHeight: 25.4,
    horizontalSpacing: 3.175,
    verticalSpacing: 0,
    offsetTop: 12.7,
    offsetLeft: 4.7625,
    sheetConfig: SHEET_LETTER_PORTRAIT,
};

// ============================================================================
// Template Registry
// ============================================================================

export const PREDEFINED_TEMPLATES: LabelTemplate[] = [
    AVERY_5160,
    AVERY_5161,
    AVERY_5163,
    AVERY_5164,
    AVERY_5167,
    AVERY_8160,
    AVERY_8163,
    AVERY_8460,
];

export const TEMPLATE_MAP = new Map<string, LabelTemplate>(
    PREDEFINED_TEMPLATES.map(t => [t.id, t])
);

// ============================================================================
// Template Utilities
// ============================================================================

/**
 * Get a template by ID
 */
export function getTemplate(id: string): LabelTemplate | undefined {
    return TEMPLATE_MAP.get(id);
}

/**
 * Get all available templates
 */
export function getAllTemplates(): LabelTemplate[] {
    return PREDEFINED_TEMPLATES;
}

/**
 * Search templates by name or description
 */
export function searchTemplates(query: string): LabelTemplate[] {
    const lowerQuery = query.toLowerCase();
    return PREDEFINED_TEMPLATES.filter(
        t =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Create a custom template
 */
export function createCustomTemplate(
    name: string,
    rows: number,
    columns: number,
    labelWidth: number,
    labelHeight: number,
    horizontalSpacing: number = 0,
    verticalSpacing: number = 0,
    sheetConfig: SheetConfig = SHEET_LETTER_PORTRAIT
): LabelTemplate {
    return {
        id: `custom-${Date.now()}`,
        name,
        description: 'Custom template',
        rows,
        columns,
        labelWidth,
        labelHeight,
        horizontalSpacing,
        verticalSpacing,
        offsetTop: sheetConfig.marginTop,
        offsetLeft: sheetConfig.marginLeft,
        sheetConfig,
    };
}

/**
 * Validate a template configuration
 */
export function validateTemplate(template: LabelTemplate): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Calculate total width and height needed
    const totalWidth =
        template.offsetLeft +
        template.columns * template.labelWidth +
        (template.columns - 1) * template.horizontalSpacing;

    const totalHeight =
        template.offsetTop +
        template.rows * template.labelHeight +
        (template.rows - 1) * template.verticalSpacing;

    // Check if it fits on the sheet
    const printableWidth =
        template.sheetConfig.width -
        template.sheetConfig.marginLeft -
        template.sheetConfig.marginRight;

    const printableHeight =
        template.sheetConfig.height -
        template.sheetConfig.marginTop -
        template.sheetConfig.marginBottom;

    if (totalWidth > printableWidth) {
        errors.push(
            `Template width (${totalWidth.toFixed(1)}mm) exceeds printable width (${printableWidth.toFixed(1)}mm)`
        );
    }

    if (totalHeight > printableHeight) {
        errors.push(
            `Template height (${totalHeight.toFixed(1)}mm) exceeds printable height (${printableHeight.toFixed(1)}mm)`
        );
    }

    // Check for valid dimensions
    if (template.labelWidth <= 0 || template.labelHeight <= 0) {
        errors.push('Label dimensions must be positive');
    }

    if (template.rows <= 0 || template.columns <= 0) {
        errors.push('Rows and columns must be positive');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Calculate the position of a label in the grid
 */
export function getLabelPosition(
    template: LabelTemplate,
    labelIndex: number
): { x: number; y: number; row: number; col: number } | null {
    const totalLabels = template.rows * template.columns;

    if (labelIndex < 0 || labelIndex >= totalLabels) {
        return null;
    }

    const row = Math.floor(labelIndex / template.columns);
    const col = labelIndex % template.columns;

    const x =
        template.offsetLeft +
        col * (template.labelWidth + template.horizontalSpacing);

    const y =
        template.offsetTop +
        row * (template.labelHeight + template.verticalSpacing);

    return { x, y, row, col };
}

/**
 * Get the total number of labels in a template
 */
export function getTotalLabels(template: LabelTemplate): number {
    return template.rows * template.columns;
}

/**
 * Check if a label has an adjacent label on a specific side
 */
export function hasAdjacentLabel(
    template: LabelTemplate,
    labelIndex: number,
    side: 'left' | 'right' | 'top' | 'bottom'
): boolean {
    const position = getLabelPosition(template, labelIndex);
    if (!position) return false;

    const { row, col } = position;

    switch (side) {
        case 'left':
            return col > 0;
        case 'right':
            return col < template.columns - 1;
        case 'top':
            return row > 0;
        case 'bottom':
            return row < template.rows - 1;
        default:
            return false;
    }
}

/**
 * Get the clipping rectangle for a label based on adjacent labels
 * Returns null if no clipping is needed (all edges are free)
 * 
 * The clip rectangle allows overflow on edges without adjacent labels,
 * and clips at label boundaries where adjacent labels exist.
 */
export function getLabelClipRect(
    template: LabelTemplate,
    labelIndex: number
): { x: number; y: number; width: number; height: number } | null {
    const position = getLabelPosition(template, labelIndex);
    if (!position) return null;

    const hasLeft = hasAdjacentLabel(template, labelIndex, 'left');
    const hasRight = hasAdjacentLabel(template, labelIndex, 'right');
    const hasTop = hasAdjacentLabel(template, labelIndex, 'top');
    const hasBottom = hasAdjacentLabel(template, labelIndex, 'bottom');

    // If all edges are free, no clipping needed
    if (!hasLeft && !hasRight && !hasTop && !hasBottom) {
        return null;
    }

    // Calculate clip rectangle
    // For edges with adjacent labels, clip at label boundary
    // For edges without adjacent labels, extend clip area to allow overflow
    const sheetWidth = template.sheetConfig.width;
    const sheetHeight = template.sheetConfig.height;
    
    // Use a large extension value to allow overflow beyond sheet bounds
    const overflowExtension = 1000; // mm
    
    // Calculate clip rectangle bounds
    // Left edge: clip at label left if has left neighbor, otherwise allow overflow left
    const labelLeft = position.x;
    const clipX = hasLeft ? labelLeft : Math.max(0, labelLeft - overflowExtension);
    
    // Top edge: clip at label top if has top neighbor, otherwise allow overflow top
    const labelTop = position.y;
    const clipY = hasTop ? labelTop : Math.max(0, labelTop - overflowExtension);
    
    // Right edge: clip at label right if has right neighbor, otherwise allow overflow right
    const labelRight = labelLeft + template.labelWidth;
    const clipRight = hasRight ? labelRight : (sheetWidth + overflowExtension);
    
    // Bottom edge: clip at label bottom if has bottom neighbor, otherwise allow overflow bottom
    const labelBottom = labelTop + template.labelHeight;
    const clipBottom = hasBottom ? labelBottom : (sheetHeight + overflowExtension);
    
    // Calculate width and height from the bounds
    const clipWidth = clipRight - clipX;
    const clipHeight = clipBottom - clipY;

    return {
        x: clipX,
        y: clipY,
        width: clipWidth,
        height: clipHeight,
    };
}