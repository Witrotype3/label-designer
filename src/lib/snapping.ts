/**
 * Snapping and Alignment Utilities
 * 
 * Provides snapping logic for aligning elements to edges, centers, and other elements
 */

import type { Transform, SnapGuide, Rect } from '@/types';

// ============================================================================
// Constants
// ============================================================================

export const SNAP_THRESHOLD = 2; // mm - distance within which snapping occurs

// ============================================================================
// Snapping Logic
// ============================================================================

/**
 * Snap a value to nearby snap points
 */
export function snapValue(
    value: number,
    snapPoints: number[],
    threshold: number = SNAP_THRESHOLD
): { snapped: number; didSnap: boolean } {
    for (const point of snapPoints) {
        if (Math.abs(value - point) <= threshold) {
            return { snapped: point, didSnap: true };
        }
    }

    return { snapped: value, didSnap: false };
}

/**
 * Get snap points for a label boundary
 */
export function getLabelSnapPoints(
    labelWidth: number,
    labelHeight: number
): {
    vertical: number[];
    horizontal: number[];
} {
    return {
        vertical: [
            0, // left edge
            labelWidth / 2, // center
            labelWidth, // right edge
        ],
        horizontal: [
            0, // top edge
            labelHeight / 2, // center
            labelHeight, // bottom edge
        ],
    };
}

/**
 * Get snap points from other elements
 */
export function getElementSnapPoints(
    elements: Transform[]
): {
    vertical: number[];
    horizontal: number[];
} {
    const vertical: number[] = [];
    const horizontal: number[] = [];

    for (const element of elements) {
        // Vertical snap points (x-axis)
        vertical.push(element.x); // left edge
        vertical.push(element.x + element.width / 2); // center
        vertical.push(element.x + element.width); // right edge

        // Horizontal snap points (y-axis)
        horizontal.push(element.y); // top edge
        horizontal.push(element.y + element.height / 2); // center
        horizontal.push(element.y + element.height); // bottom edge
    }

    return { vertical, horizontal };
}

/**
 * Snap an element's position to guides
 */
export function snapElementPosition(
    transform: Transform,
    labelWidth: number,
    labelHeight: number,
    otherElements: Transform[] = []
): {
    transform: Transform;
    guides: SnapGuide[];
} {
    const guides: SnapGuide[] = [];

    // Get all snap points
    const labelSnaps = getLabelSnapPoints(labelWidth, labelHeight);
    const elementSnaps = getElementSnapPoints(otherElements);

    // Combine snap points
    const verticalSnaps = [...labelSnaps.vertical, ...elementSnaps.vertical];
    const horizontalSnaps = [...labelSnaps.horizontal, ...elementSnaps.horizontal];

    // Calculate element edges
    const left = transform.x;
    const right = transform.x + transform.width;
    const centerX = transform.x + transform.width / 2;

    const top = transform.y;
    const bottom = transform.y + transform.height;
    const centerY = transform.y + transform.height / 2;

    // Try snapping left edge
    const leftSnap = snapValue(left, verticalSnaps);
    if (leftSnap.didSnap) {
        transform.x = leftSnap.snapped;
        guides.push({
            type: 'vertical',
            position: leftSnap.snapped,
            label: 'Left',
        });
    }

    // Try snapping right edge
    const rightSnap = snapValue(right, verticalSnaps);
    if (rightSnap.didSnap && !leftSnap.didSnap) {
        transform.x = rightSnap.snapped - transform.width;
        guides.push({
            type: 'vertical',
            position: rightSnap.snapped,
            label: 'Right',
        });
    }

    // Try snapping center X
    const centerXSnap = snapValue(centerX, verticalSnaps);
    if (centerXSnap.didSnap && !leftSnap.didSnap && !rightSnap.didSnap) {
        transform.x = centerXSnap.snapped - transform.width / 2;
        guides.push({
            type: 'vertical',
            position: centerXSnap.snapped,
            label: 'Center',
        });
    }

    // Try snapping top edge
    const topSnap = snapValue(top, horizontalSnaps);
    if (topSnap.didSnap) {
        transform.y = topSnap.snapped;
        guides.push({
            type: 'horizontal',
            position: topSnap.snapped,
            label: 'Top',
        });
    }

    // Try snapping bottom edge
    const bottomSnap = snapValue(bottom, horizontalSnaps);
    if (bottomSnap.didSnap && !topSnap.didSnap) {
        transform.y = bottomSnap.snapped - transform.height;
        guides.push({
            type: 'horizontal',
            position: bottomSnap.snapped,
            label: 'Bottom',
        });
    }

    // Try snapping center Y
    const centerYSnap = snapValue(centerY, horizontalSnaps);
    if (centerYSnap.didSnap && !topSnap.didSnap && !bottomSnap.didSnap) {
        transform.y = centerYSnap.snapped - transform.height / 2;
        guides.push({
            type: 'horizontal',
            position: centerYSnap.snapped,
            label: 'Center',
        });
    }

    return { transform, guides };
}

/**
 * Constrain an element to stay within label bounds
 */
export function constrainToBounds(
    transform: Transform,
    labelWidth: number,
    labelHeight: number
): Transform {
    const result = { ...transform };

    // Constrain X
    if (result.x < 0) {
        result.x = 0;
    }
    if (result.x + result.width > labelWidth) {
        result.x = labelWidth - result.width;
    }

    // Constrain Y
    if (result.y < 0) {
        result.y = 0;
    }
    if (result.y + result.height > labelHeight) {
        result.y = labelHeight - result.height;
    }

    return result;
}

/**
 * Distribute elements evenly horizontally
 */
export function distributeHorizontally(
    elements: Transform[],
    labelWidth: number
): Transform[] {
    if (elements.length < 2) {
        return elements;
    }

    // Sort by x position
    const sorted = [...elements].sort((a, b) => a.x - b.x);

    // Calculate total width of all elements
    const totalElementWidth = sorted.reduce((sum, el) => sum + el.width, 0);

    // Calculate spacing
    const availableSpace = labelWidth - totalElementWidth;
    const spacing = availableSpace / (sorted.length + 1);

    // Distribute
    let currentX = spacing;
    return sorted.map(el => ({
        ...el,
        x: currentX,
        y: el.y,
    })).map((el, i) => {
        const result = el;
        if (i < sorted.length - 1) {
            currentX += el.width + spacing;
        }
        return result;
    });
}

/**
 * Distribute elements evenly vertically
 */
export function distributeVertically(
    elements: Transform[],
    labelHeight: number
): Transform[] {
    if (elements.length < 2) {
        return elements;
    }

    // Sort by y position
    const sorted = [...elements].sort((a, b) => a.y - b.y);

    // Calculate total height of all elements
    const totalElementHeight = sorted.reduce((sum, el) => sum + el.height, 0);

    // Calculate spacing
    const availableSpace = labelHeight - totalElementHeight;
    const spacing = availableSpace / (sorted.length + 1);

    // Distribute
    let currentY = spacing;
    return sorted.map(el => ({
        ...el,
        x: el.x,
        y: currentY,
    })).map((el, i) => {
        const result = el;
        if (i < sorted.length - 1) {
            currentY += el.height + spacing;
        }
        return result;
    });
}

/**
 * Align elements to a common edge
 */
export function alignElements(
    elements: Transform[],
    alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
): Transform[] {
    if (elements.length < 2) {
        return elements;
    }

    switch (alignment) {
        case 'left': {
            const minX = Math.min(...elements.map(el => el.x));
            return elements.map(el => ({ ...el, x: minX }));
        }

        case 'center': {
            const avgCenterX =
                elements.reduce((sum, el) => sum + el.x + el.width / 2, 0) /
                elements.length;
            return elements.map(el => ({
                ...el,
                x: avgCenterX - el.width / 2,
            }));
        }

        case 'right': {
            const maxRight = Math.max(...elements.map(el => el.x + el.width));
            return elements.map(el => ({ ...el, x: maxRight - el.width }));
        }

        case 'top': {
            const minY = Math.min(...elements.map(el => el.y));
            return elements.map(el => ({ ...el, y: minY }));
        }

        case 'middle': {
            const avgCenterY =
                elements.reduce((sum, el) => sum + el.y + el.height / 2, 0) /
                elements.length;
            return elements.map(el => ({
                ...el,
                y: avgCenterY - el.height / 2,
            }));
        }

        case 'bottom': {
            const maxBottom = Math.max(...elements.map(el => el.y + el.height));
            return elements.map(el => ({ ...el, y: maxBottom - el.height }));
        }

        default:
            return elements;
    }
}

/**
 * Check if two rectangles overlap
 */
export function rectsOverlap(a: Rect, b: Rect): boolean {
    return !(
        a.x + a.width < b.x ||
        b.x + b.width < a.x ||
        a.y + a.height < b.y ||
        b.y + b.height < a.y
    );
}

/**
 * Get the bounding box of multiple transforms
 */
export function getBoundingBox(transforms: Transform[]): Rect | null {
    if (transforms.length === 0) {
        return null;
    }

    const minX = Math.min(...transforms.map(t => t.x));
    const minY = Math.min(...transforms.map(t => t.y));
    const maxX = Math.max(...transforms.map(t => t.x + t.width));
    const maxY = Math.max(...transforms.map(t => t.y + t.height));

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}
