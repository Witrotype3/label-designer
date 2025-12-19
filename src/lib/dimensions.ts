/**
 * Physical Dimension Conversion Utilities
 * 
 * All internal measurements are stored in millimeters (mm).
 * This module handles conversion between mm, inches, and pixels.
 */

import type { Unit, PhysicalDimension } from '@/types';

// ============================================================================
// Constants
// ============================================================================

export const MM_PER_INCH = 25.4;
export const SCREEN_DPI = 96; // Standard screen DPI
export const PRINT_DPI = 300; // High-quality print DPI

// Common page sizes in mm
export const PAGE_SIZES = {
    Letter: { width: 215.9, height: 279.4 },
    A4: { width: 210, height: 297 },
    Legal: { width: 215.9, height: 355.6 },
} as const;

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert millimeters to inches
 */
export function mmToInch(mm: number): number {
    return mm / MM_PER_INCH;
}

/**
 * Convert inches to millimeters
 */
export function inchToMm(inch: number): number {
    return inch * MM_PER_INCH;
}

/**
 * Convert millimeters to pixels at a given DPI
 */
export function mmToPx(mm: number, dpi: number = SCREEN_DPI): number {
    return (mm / MM_PER_INCH) * dpi;
}

/**
 * Convert pixels to millimeters at a given DPI
 */
export function pxToMm(px: number, dpi: number = SCREEN_DPI): number {
    return (px / dpi) * MM_PER_INCH;
}

/**
 * Convert points (typography) to millimeters
 * 1 point = 1/72 inch
 */
export function ptToMm(pt: number): number {
    return (pt / 72) * MM_PER_INCH;
}

/**
 * Convert millimeters to points (typography)
 */
export function mmToPt(mm: number): number {
    return (mm / MM_PER_INCH) * 72;
}

/**
 * Convert any physical dimension to millimeters
 */
export function toMm(dimension: PhysicalDimension): number {
    switch (dimension.unit) {
        case 'mm':
            return dimension.value;
        case 'inch':
            return inchToMm(dimension.value);
        case 'px':
            return pxToMm(dimension.value, SCREEN_DPI);
        default:
            return dimension.value;
    }
}

/**
 * Convert millimeters to a specific unit
 */
export function fromMm(mm: number, unit: Unit, dpi: number = SCREEN_DPI): number {
    switch (unit) {
        case 'mm':
            return mm;
        case 'inch':
            return mmToInch(mm);
        case 'px':
            return mmToPx(mm, dpi);
        default:
            return mm;
    }
}

// ============================================================================
// Coordinate System Utilities
// ============================================================================

/**
 * Transform a point from canvas coordinates to physical coordinates (mm)
 */
export function canvasToPhysical(
    canvasX: number,
    canvasY: number,
    zoom: number,
    panX: number,
    panY: number,
    dpi: number = SCREEN_DPI
): { x: number; y: number } {
    // Remove pan offset
    const x = (canvasX - panX) / zoom;
    const y = (canvasY - panY) / zoom;

    // Convert to mm
    return {
        x: pxToMm(x, dpi),
        y: pxToMm(y, dpi),
    };
}

/**
 * Transform a point from physical coordinates (mm) to canvas coordinates
 */
export function physicalToCanvas(
    physicalX: number,
    physicalY: number,
    zoom: number,
    panX: number,
    panY: number,
    dpi: number = SCREEN_DPI
): { x: number; y: number } {
    // Convert to pixels
    const x = mmToPx(physicalX, dpi);
    const y = mmToPx(physicalY, dpi);

    // Apply zoom and pan
    return {
        x: x * zoom + panX,
        y: y * zoom + panY,
    };
}

/**
 * Get the scale factor for rendering at a specific zoom level
 */
export function getScaleFactor(zoom: number, dpi: number = SCREEN_DPI): number {
    return zoom * (dpi / SCREEN_DPI);
}

// ============================================================================
// DPI Quality Checks
// ============================================================================

/**
 * Check if an image has sufficient DPI for printing
 * Returns the effective DPI of the image at its current size
 */
export function calculateImageDPI(
    originalWidthPx: number,
    originalHeightPx: number,
    displayWidthMm: number,
    displayHeightMm: number
): { widthDPI: number; heightDPI: number; sufficient: boolean } {
    const displayWidthInch = mmToInch(displayWidthMm);
    const displayHeightInch = mmToInch(displayHeightMm);

    const widthDPI = originalWidthPx / displayWidthInch;
    const heightDPI = originalHeightPx / displayHeightInch;

    const minDPI = Math.min(widthDPI, heightDPI);

    return {
        widthDPI,
        heightDPI,
        sufficient: minDPI >= 200, // Acceptable for print
    };
}

/**
 * Get a warning message if image quality is insufficient
 */
export function getImageQualityWarning(
    originalWidthPx: number,
    originalHeightPx: number,
    displayWidthMm: number,
    displayHeightMm: number
): string | null {
    const { widthDPI, heightDPI, sufficient } = calculateImageDPI(
        originalWidthPx,
        originalHeightPx,
        displayWidthMm,
        displayHeightMm
    );

    if (sufficient) {
        return null;
    }

    const minDPI = Math.min(widthDPI, heightDPI);

    if (minDPI < 150) {
        return `Low quality: ${Math.round(minDPI)} DPI (recommended: 200+ DPI)`;
    } else if (minDPI < 200) {
        return `Moderate quality: ${Math.round(minDPI)} DPI (recommended: 200+ DPI)`;
    }

    return null;
}

// ============================================================================
// Rounding and Precision
// ============================================================================

/**
 * Round to a specific number of decimal places
 */
export function roundTo(value: number, decimals: number = 2): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
}

/**
 * Snap a value to a grid
 */
export function snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
}
