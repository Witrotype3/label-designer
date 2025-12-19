/**
 * Master/Override System
 * 
 * Handles the logic for master label propagation and per-label overrides
 */

import type {
    MasterLabel,
    LabelOverride,
    DesignElement,
    ElementOverride,
} from '@/types';

// ============================================================================
// Master Label Operations
// ============================================================================

/**
 * Get the effective elements for a label by merging master with overrides
 */
export function getEffectiveElements(
    masterLabel: MasterLabel,
    override?: LabelOverride
): DesignElement[] {
    let result: DesignElement[] = [];

    if (!override) {
        result = [...masterLabel.elements];
    } else {
        // Process master elements
        for (const masterElement of masterLabel.elements) {
            // Check if this element is hidden
            if (override.hiddenElementIds.includes(masterElement.id)) {
                continue;
            }

            // Check if this element has overrides
            const elementOverride = override.elementOverrides.find(
                eo => eo.elementId === masterElement.id
            );

            if (elementOverride) {
                // Merge master with override
                result.push({
                    ...masterElement,
                    ...elementOverride.overrides,
                } as DesignElement);
            } else {
                // Use master as-is
                result.push({ ...masterElement });
            }
        }

        // Add additional elements specific to this label
        result.push(...override.additionalElements);
    }

    // Sort by zIndex (ascending - lower zIndex renders first/behind)
    result.sort((a, b) => a.zIndex - b.zIndex);

    return result;
}

/**
 * Check if a label has any overrides
 */
export function hasOverrides(override?: LabelOverride): boolean {
    if (!override) {
        return false;
    }

    return (
        override.elementOverrides.length > 0 ||
        override.hiddenElementIds.length > 0 ||
        override.additionalElements.length > 0
    );
}

/**
 * Check if a specific element is overridden in a label
 */
export function isElementOverridden(
    elementId: string,
    override?: LabelOverride
): boolean {
    if (!override) {
        return false;
    }

    return (
        override.elementOverrides.some(eo => eo.elementId === elementId) ||
        override.hiddenElementIds.includes(elementId)
    );
}

// ============================================================================
// Override Management
// ============================================================================

/**
 * Create an override for an element property
 */
export function createElementOverride(
    labelIndex: number,
    elementId: string,
    overrides: Partial<DesignElement>,
    existingOverride?: LabelOverride
): LabelOverride {
    const base: LabelOverride = existingOverride || {
        labelIndex,
        elementOverrides: [],
        hiddenElementIds: [],
        additionalElements: [],
    };

    // Find existing override for this element
    const existingElementOverride = base.elementOverrides.find(
        eo => eo.elementId === elementId
    );

    if (existingElementOverride) {
        // Merge with existing override
        existingElementOverride.overrides = {
            ...existingElementOverride.overrides,
            ...overrides,
        };
    } else {
        // Create new override
        base.elementOverrides.push({
            elementId,
            overrides,
        });
    }

    return base;
}

/**
 * Remove an override for a specific element
 */
export function removeElementOverride(
    elementId: string,
    override: LabelOverride
): LabelOverride {
    return {
        ...override,
        elementOverrides: override.elementOverrides.filter(
            eo => eo.elementId !== elementId
        ),
        hiddenElementIds: override.hiddenElementIds.filter(id => id !== elementId),
    };
}

/**
 * Hide an element in a specific label
 */
export function hideElement(
    labelIndex: number,
    elementId: string,
    existingOverride?: LabelOverride
): LabelOverride {
    const base: LabelOverride = existingOverride || {
        labelIndex,
        elementOverrides: [],
        hiddenElementIds: [],
        additionalElements: [],
    };

    if (!base.hiddenElementIds.includes(elementId)) {
        base.hiddenElementIds.push(elementId);
    }

    return base;
}

/**
 * Show a previously hidden element
 */
export function showElement(
    elementId: string,
    override: LabelOverride
): LabelOverride {
    return {
        ...override,
        hiddenElementIds: override.hiddenElementIds.filter(id => id !== elementId),
    };
}

/**
 * Add an element specific to a label
 */
export function addLabelSpecificElement(
    labelIndex: number,
    element: DesignElement,
    existingOverride?: LabelOverride
): LabelOverride {
    const base: LabelOverride = existingOverride || {
        labelIndex,
        elementOverrides: [],
        hiddenElementIds: [],
        additionalElements: [],
    };

    base.additionalElements.push(element);

    return base;
}

/**
 * Remove a label-specific element
 */
export function removeLabelSpecificElement(
    elementId: string,
    override: LabelOverride
): LabelOverride {
    return {
        ...override,
        additionalElements: override.additionalElements.filter(
            e => e.id !== elementId
        ),
    };
}

/**
 * Reset all overrides for a label (sync with master)
 */
export function resetLabelOverrides(labelIndex: number): LabelOverride {
    return {
        labelIndex,
        elementOverrides: [],
        hiddenElementIds: [],
        additionalElements: [],
    };
}

/**
 * Reset a specific element override (sync with master for that element)
 */
export function resetElementOverride(
    elementId: string,
    override: LabelOverride
): LabelOverride {
    return {
        ...override,
        elementOverrides: override.elementOverrides.filter(
            eo => eo.elementId !== elementId
        ),
        hiddenElementIds: override.hiddenElementIds.filter(id => id !== elementId),
    };
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Apply an override to multiple labels
 */
export function applyOverrideToLabels(
    labelIndices: number[],
    elementId: string,
    overrides: Partial<DesignElement>,
    existingOverrides: Map<number, LabelOverride>
): Map<number, LabelOverride> {
    const result = new Map(existingOverrides);

    for (const labelIndex of labelIndices) {
        const existing = result.get(labelIndex);
        const updated = createElementOverride(
            labelIndex,
            elementId,
            overrides,
            existing
        );
        result.set(labelIndex, updated);
    }

    return result;
}

/**
 * Reset overrides for multiple labels
 */
export function resetMultipleLabels(
    labelIndices: number[]
): Map<number, LabelOverride> {
    const result = new Map<number, LabelOverride>();

    for (const labelIndex of labelIndices) {
        result.set(labelIndex, resetLabelOverrides(labelIndex));
    }

    return result;
}

// ============================================================================
// Propagation Utilities
// ============================================================================

/**
 * Get all labels that will be affected by a master change
 * (i.e., labels that don't have overrides for the changed element)
 */
export function getAffectedLabels(
    elementId: string,
    totalLabels: number,
    overrides: Map<number, LabelOverride>
): number[] {
    const affected: number[] = [];

    for (let i = 0; i < totalLabels; i++) {
        const override = overrides.get(i);
        if (!isElementOverridden(elementId, override)) {
            affected.push(i);
        }
    }

    return affected;
}

/**
 * Check if a master change will affect a specific label
 */
export function willMasterChangeAffectLabel(
    elementId: string,
    labelIndex: number,
    overrides: Map<number, LabelOverride>
): boolean {
    const override = overrides.get(labelIndex);
    return !isElementOverridden(elementId, override);
}
