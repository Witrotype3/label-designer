/**
 * Design State Store
 * 
 * Zustand store for managing the entire application state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { temporal } from 'zundo';
import type {
    LabelTemplate,
    MasterLabel,
    LabelOverride,
    DesignElement,
    TextElement,
    ImageElement,
    ShapeElement,
    PlaceholderElement,
} from '@/types';
import { AVERY_5163 } from '@/lib/templates';
import { getEffectiveElements, createElementOverride } from '@/lib/masterOverride';

// ============================================================================
// State Interface
// ============================================================================

export type ViewMode = 'TEMPLATE' | 'PREVIEW';

export interface DesignStore {
    // Template and sheet
    // Template and sheet
    template: LabelTemplate;
    setTemplate: (template: LabelTemplate) => void;

    // View Mode
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    
    // Preview mode page navigation
    previewPageIndex: number;
    setPreviewPageIndex: (index: number) => void;

    // Master label
    masterLabel: MasterLabel;
    setMasterLabel: (masterLabel: MasterLabel) => void;
    addElementToMaster: (element: DesignElement) => void;
    updateMasterElement: (elementId: string, updates: Partial<DesignElement>) => void;
    removeMasterElement: (elementId: string) => void;

    // Label overrides
    labelOverrides: Map<number, LabelOverride>;
    setLabelOverride: (labelIndex: number, override: LabelOverride) => void;
    removeLabelOverride: (labelIndex: number) => void;
    clearAllOverrides: () => void;
    updateLabelElement: (labelIndex: number, elementId: string, updates: Partial<DesignElement>) => void;

    // Selection
    selectedLabelIndex: number | null;
    selectedElementIds: string[];
    setSelectedLabel: (labelIndex: number | null) => void;
    setSelectedElements: (elementIds: string[]) => void;
    toggleElementSelection: (elementId: string) => void;
    clearSelection: () => void;

    // View state
    zoom: number;
    panX: number;
    panY: number;
    setZoom: (zoom: number) => void;
    setPan: (panX: number, panY: number) => void;
    resetView: () => void;

    // Utility functions
    getEffectiveElementsForLabel: (labelIndex: number) => DesignElement[];
    getTotalLabels: () => number;

    // Z-order management
    bringToFront: (elementId: string) => void;
    sendToBack: (elementId: string) => void;
    bringForward: (elementId: string) => void;
    sendBackward: (elementId: string) => void;
    reorderElements: (elementIds: string[]) => void;

    // Copy/paste/duplicate
    copyElements: (elementIds: string[]) => void;
    pasteElements: () => void;
    duplicateElements: (elementIds: string[]) => void;
    clipboard: DesignElement[]; // Internal clipboard state

    // Align/distribute
    alignElements: (elementIds: string[], alignment: 'left' | 'right' | 'center' | 'top' | 'bottom' | 'middle') => void;
    distributeElements: (elementIds: string[], direction: 'horizontal' | 'vertical') => void;
    alignElementsToLabel: (elementIds: string[], alignment: 'left' | 'right' | 'centerH' | 'top' | 'bottom' | 'centerV') => void;

    // History (placeholder for undo/redo)
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialMasterLabel: MasterLabel = {
    elements: [],
    backgroundColor: '#ffffff',
};

// ============================================================================
// Store Creation
// ============================================================================

// Store without temporal middleware (for internal use)
const storeCreator = (set: (partial: Partial<DesignStore> | ((state: DesignStore) => Partial<DesignStore>)) => void, get: () => DesignStore): DesignStore => ({
            // Initial state
            template: AVERY_5163,
    viewMode: 'TEMPLATE' as ViewMode,
    previewPageIndex: 0,
            masterLabel: initialMasterLabel,
    labelOverrides: new Map<number, LabelOverride>(),
    selectedLabelIndex: null as number | null,
    selectedElementIds: [] as string[],
            zoom: 1.0,
            panX: 0,
            panY: 0,
    clipboard: [] as DesignElement[],
    // canUndo and canRedo will be computed dynamically

            // Template actions
            setTemplate: (template) => {
                set({ template, labelOverrides: new Map() });
            },

            // View Mode actions
            setViewMode: (viewMode) => {
                set({ viewMode });
            },

    // Preview page navigation
    setPreviewPageIndex: (index) => {
        set((state: DesignStore) => ({
            previewPageIndex: Math.max(0, index),
            // Clear label selection when changing pages to avoid editing wrong label
            selectedLabelIndex: null,
            selectedElementIds: [],
        }));
    },

            // Master label actions
            setMasterLabel: (masterLabel) => {
                set({ masterLabel });
            },

            addElementToMaster: (element) => {
        set((state) => {
            // Assign zIndex to be on top of all existing elements
            const maxZIndex = state.masterLabel.elements.length > 0
                ? Math.max(...state.masterLabel.elements.map(el => el.zIndex), -1)
                : -1;
            const elementWithZIndex = { ...element, zIndex: maxZIndex + 1 };
            return {
                    masterLabel: {
                        ...state.masterLabel,
                    elements: [...state.masterLabel.elements, elementWithZIndex],
                },
            };
        });
    },

            updateMasterElement: (elementId: string, updates: Partial<DesignElement>) => {
                set((state: DesignStore) => {
                    const updatedElements = state.masterLabel.elements.map((el: DesignElement) =>
                        el.id === elementId ? { ...el, ...updates } as DesignElement : el
                    );
                    return {
                    masterLabel: {
                        ...state.masterLabel,
                            elements: updatedElements,
                    },
                    };
                });
            },

            removeMasterElement: (elementId: string) => {
                set((state: DesignStore) => ({
                    masterLabel: {
                        ...state.masterLabel,
                        elements: state.masterLabel.elements.filter((el: DesignElement) => el.id !== elementId) as DesignElement[],
                    },
                    selectedElementIds: state.selectedElementIds.filter((id: string) => id !== elementId),
                }));
            },

            // Override actions
            setLabelOverride: (labelIndex: number, override: LabelOverride) => {
                set((state: DesignStore) => {
                    const newOverrides = new Map(state.labelOverrides);
                    newOverrides.set(labelIndex, override);
                    return { labelOverrides: newOverrides };
                });
            },

            removeLabelOverride: (labelIndex: number) => {
                set((state: DesignStore) => {
                    const newOverrides = new Map(state.labelOverrides);
                    newOverrides.delete(labelIndex);
                    return { labelOverrides: newOverrides };
                });
            },

            clearAllOverrides: () => {
                set({ labelOverrides: new Map() });
            },

            updateLabelElement: (labelIndex: number, elementId: string, updates: Partial<DesignElement>) => {
                set((state: DesignStore) => {
                    const existingOverride = state.labelOverrides.get(labelIndex);
                    
                    // Check if element is only in additionalElements (not in master)
                    const isInMaster = state.masterLabel.elements.some(el => el.id === elementId);
                    const isInAdditional = existingOverride?.additionalElements.some(el => el.id === elementId);
                    
                    if (!isInMaster && isInAdditional && existingOverride) {
                        // Element is only in additionalElements - update it directly
                        const updatedAdditional = existingOverride.additionalElements.map(el => 
                            el.id === elementId ? { ...el, ...updates } as DesignElement : el
                        );
                        const newOverride: LabelOverride = {
                            ...existingOverride,
                            additionalElements: updatedAdditional,
                        };
                        const newOverrides = new Map(state.labelOverrides);
                        newOverrides.set(labelIndex, newOverride);
                        return { labelOverrides: newOverrides };
                    } else {
                        // Element is in master (or will be) - use normal override mechanism
                        const newOverride = createElementOverride(labelIndex, elementId, updates, existingOverride);
                        const newOverrides = new Map(state.labelOverrides);
                        newOverrides.set(labelIndex, newOverride);
                        return { labelOverrides: newOverrides };
                    }
                });
            },

            // Selection actions
            setSelectedLabel: (labelIndex) => {
                set({ selectedLabelIndex: labelIndex });
            },

            setSelectedElements: (elementIds) => {
                set({ selectedElementIds: elementIds });
            },

            toggleElementSelection: (elementId: string) => {
                set((state: DesignStore) => {
                    const isSelected = state.selectedElementIds.includes(elementId);
                    return {
                        selectedElementIds: isSelected
                            ? state.selectedElementIds.filter((id: string) => id !== elementId)
                            : [...state.selectedElementIds, elementId],
                    };
                });
            },

            clearSelection: () => {
                set({ selectedElementIds: [] });
            },

            // View actions
            setZoom: (zoom) => {
                set({ zoom: Math.max(0.1, Math.min(5.0, zoom)) });
            },

            setPan: (panX, panY) => {
                set({ panX, panY });
            },

            resetView: () => {
                set({ zoom: 1.0, panX: 0, panY: 0 });
            },

            // Utility functions
            getEffectiveElementsForLabel: (labelIndex) => {
                const state = get();
                const override = state.labelOverrides.get(labelIndex);
                return getEffectiveElements(state.masterLabel, override);
            },

            getTotalLabels: () => {
                const state = get();
                return state.template.rows * state.template.columns;
            },

    // Z-order management actions
    bringToFront: (elementId: string) => {
        set((state: DesignStore) => {
            const elements = state.masterLabel.elements;
            const maxZIndex = Math.max(...elements.map(el => el.zIndex), -1);
            const updatedElements = elements.map((el: DesignElement) =>
                el.id === elementId ? { ...el, zIndex: maxZIndex + 1 } : el
            );
            return {
                masterLabel: {
                    ...state.masterLabel,
                    elements: updatedElements,
                },
            };
        });
    },

    sendToBack: (elementId: string) => {
        set((state: DesignStore) => {
            const elements = state.masterLabel.elements;
            const minZIndex = Math.min(...elements.map(el => el.zIndex), 0);
            const updatedElements = elements.map((el: DesignElement) =>
                el.id === elementId ? { ...el, zIndex: minZIndex - 1 } : el
            );
            return {
                masterLabel: {
                    ...state.masterLabel,
                    elements: updatedElements,
                },
            };
        });
    },

    bringForward: (elementId: string) => {
        set((state: DesignStore) => {
            const elements = [...state.masterLabel.elements];
            const elementIndex = elements.findIndex(el => el.id === elementId);
            if (elementIndex === -1) return state;

            const currentElement = elements[elementIndex];
            // Find next element with higher zIndex
            const nextElement = elements
                .filter(el => el.zIndex > currentElement.zIndex)
                .sort((a, b) => a.zIndex - b.zIndex)[0];

            if (nextElement) {
                // Swap zIndex values
                const tempZIndex = currentElement.zIndex;
                const updatedElements = elements.map((el: DesignElement) => {
                    if (el.id === elementId) {
                        return { ...el, zIndex: nextElement.zIndex };
                    } else if (el.id === nextElement.id) {
                        return { ...el, zIndex: tempZIndex };
                    }
                    return el;
                });
                return {
                    masterLabel: {
                        ...state.masterLabel,
                        elements: updatedElements,
                    },
                };
            }
            return state;
        });
    },

    sendBackward: (elementId: string) => {
        set((state: DesignStore) => {
            const elements = [...state.masterLabel.elements];
            const elementIndex = elements.findIndex(el => el.id === elementId);
            if (elementIndex === -1) return state;

            const currentElement = elements[elementIndex];
            // Find previous element with lower zIndex
            const prevElement = elements
                .filter(el => el.zIndex < currentElement.zIndex)
                .sort((a, b) => b.zIndex - a.zIndex)[0];

            if (prevElement) {
                // Swap zIndex values
                const tempZIndex = currentElement.zIndex;
                const updatedElements = elements.map((el: DesignElement) => {
                    if (el.id === elementId) {
                        return { ...el, zIndex: prevElement.zIndex };
                    } else if (el.id === prevElement.id) {
                        return { ...el, zIndex: tempZIndex };
                    }
                    return el;
                });
                return {
                    masterLabel: {
                        ...state.masterLabel,
                        elements: updatedElements,
                    },
                };
            }
            return state;
        });
    },

    reorderElements: (elementIds: string[]) => {
        set((state: DesignStore) => {
            // Assign sequential zIndex values based on new order
            const updatedElements = state.masterLabel.elements.map((el: DesignElement) => {
                const newIndex = elementIds.indexOf(el.id);
                if (newIndex === -1) {
                    // Element not in reorder list, keep current zIndex
                    return el;
                }
                return { ...el, zIndex: newIndex };
            });
            return {
                masterLabel: {
                    ...state.masterLabel,
                    elements: updatedElements,
                },
            };
        });
    },

    // Copy/paste/duplicate actions
    copyElements: (elementIds: string[]) => {
        set((state: DesignStore) => {
            const elementsToCopy = state.masterLabel.elements.filter((el: DesignElement) =>
                elementIds.includes(el.id)
            );
            // Deep clone elements with new IDs
            const clonedElements = elementsToCopy.map((el: DesignElement) => ({
                ...el,
                id: generateElementId(),
            }));
            return { clipboard: clonedElements };
        });
    },

    pasteElements: () => {
        set((state: DesignStore) => {
            if (state.clipboard.length === 0) return state;

            // Get max zIndex to place pasted elements on top
            const maxZIndex = state.masterLabel.elements.length > 0
                ? Math.max(...state.masterLabel.elements.map(el => el.zIndex), -1)
                : -1;

            // Offset pasted elements slightly (5mm right and down)
            const offsetX = 5;
            const offsetY = 5;

            const pastedElements = state.clipboard.map((el: DesignElement, index: number) => ({
                ...el,
                id: generateElementId(),
                zIndex: maxZIndex + 1 + index,
                transform: {
                    ...el.transform,
                    x: el.transform.x + offsetX,
                    y: el.transform.y + offsetY,
                },
            }));

            const newSelectedIds = pastedElements.map(el => el.id);

            return {
                masterLabel: {
                    ...state.masterLabel,
                    elements: [...state.masterLabel.elements, ...pastedElements],
                },
                selectedElementIds: newSelectedIds,
            };
        });
    },

    duplicateElements: (elementIds: string[]) => {
        set((state: DesignStore) => {
            const elementsToDuplicate = state.masterLabel.elements.filter((el: DesignElement) =>
                elementIds.includes(el.id)
            );

            if (elementsToDuplicate.length === 0) return state;

            // Get max zIndex to place duplicated elements on top
            const maxZIndex = state.masterLabel.elements.length > 0
                ? Math.max(...state.masterLabel.elements.map(el => el.zIndex), -1)
                : -1;

            // Offset duplicated elements slightly (5mm right and down)
            const offsetX = 5;
            const offsetY = 5;

            const duplicatedElements = elementsToDuplicate.map((el: DesignElement, index: number) => ({
                ...el,
                id: generateElementId(),
                zIndex: maxZIndex + 1 + index,
                transform: {
                    ...el.transform,
                    x: el.transform.x + offsetX,
                    y: el.transform.y + offsetY,
                },
            }));

            const newSelectedIds = duplicatedElements.map(el => el.id);

            return {
                masterLabel: {
                    ...state.masterLabel,
                    elements: [...state.masterLabel.elements, ...duplicatedElements],
                },
                selectedElementIds: newSelectedIds,
            };
        });
    },

    // Align/distribute actions
    alignElements: (elementIds: string[], alignment: 'left' | 'right' | 'center' | 'top' | 'bottom' | 'middle') => {
        set((state: DesignStore) => {
            if (elementIds.length < 2) return state;

            const elementsToAlign = state.masterLabel.elements.filter((el: DesignElement) =>
                elementIds.includes(el.id)
            );

            if (elementsToAlign.length < 2) return state;

            let referenceValue: number;
            const updatedElements = [...state.masterLabel.elements];

            // Calculate reference value based on alignment type
            if (alignment === 'left') {
                referenceValue = Math.min(...elementsToAlign.map(el => el.transform.x));
            } else if (alignment === 'right') {
                referenceValue = Math.max(...elementsToAlign.map(el => el.transform.x + el.transform.width));
            } else if (alignment === 'center') {
                const centers = elementsToAlign.map(el => el.transform.x + el.transform.width / 2);
                referenceValue = (Math.min(...centers) + Math.max(...centers)) / 2;
            } else if (alignment === 'top') {
                referenceValue = Math.min(...elementsToAlign.map(el => el.transform.y));
            } else if (alignment === 'bottom') {
                referenceValue = Math.max(...elementsToAlign.map(el => el.transform.y + el.transform.height));
            } else if (alignment === 'middle') {
                const middles = elementsToAlign.map(el => el.transform.y + el.transform.height / 2);
                referenceValue = (Math.min(...middles) + Math.max(...middles)) / 2;
            } else {
                return state;
            }

            // Update elements
            elementsToAlign.forEach((element) => {
                const index = updatedElements.findIndex(el => el.id === element.id);
                if (index === -1) return;

                const newTransform = { ...element.transform };

                if (alignment === 'left') {
                    newTransform.x = referenceValue;
                } else if (alignment === 'right') {
                    newTransform.x = referenceValue - element.transform.width;
                } else if (alignment === 'center') {
                    newTransform.x = referenceValue - element.transform.width / 2;
                } else if (alignment === 'top') {
                    newTransform.y = referenceValue;
                } else if (alignment === 'bottom') {
                    newTransform.y = referenceValue - element.transform.height;
                } else if (alignment === 'middle') {
                    newTransform.y = referenceValue - element.transform.height / 2;
                }

                updatedElements[index] = { ...element, transform: newTransform };
            });

            return {
                masterLabel: {
                    ...state.masterLabel,
                    elements: updatedElements,
                },
            };
        });
    },

    distributeElements: (elementIds: string[], direction: 'horizontal' | 'vertical') => {
        set((state: DesignStore) => {
            if (elementIds.length < 3) return state;

            const elementsToDistribute = state.masterLabel.elements.filter((el: DesignElement) =>
                elementIds.includes(el.id)
            ).sort((a, b) => {
                if (direction === 'horizontal') {
                    return a.transform.x - b.transform.x;
                } else {
                    return a.transform.y - b.transform.y;
                }
            });

            if (elementsToDistribute.length < 3) return state;

            const updatedElements = [...state.masterLabel.elements];

            if (direction === 'horizontal') {
                const firstX = elementsToDistribute[0].transform.x;
                const lastX = elementsToDistribute[elementsToDistribute.length - 1].transform.x;
                const totalWidth = elementsToDistribute.reduce((sum, el) => sum + el.transform.width, 0);
                const gap = (lastX - firstX - totalWidth) / (elementsToDistribute.length - 1);

                let currentX = firstX;
                elementsToDistribute.forEach((element, index) => {
                    if (index > 0) {
                        currentX += elementsToDistribute[index - 1].transform.width + gap;
                    }
                    const elementIndex = updatedElements.findIndex(el => el.id === element.id);
                    if (elementIndex !== -1) {
                        updatedElements[elementIndex] = {
                            ...element,
                            transform: { ...element.transform, x: currentX },
                        };
                    }
                });
            } else {
                const firstY = elementsToDistribute[0].transform.y;
                const lastY = elementsToDistribute[elementsToDistribute.length - 1].transform.y;
                const totalHeight = elementsToDistribute.reduce((sum, el) => sum + el.transform.height, 0);
                const gap = (lastY - firstY - totalHeight) / (elementsToDistribute.length - 1);

                let currentY = firstY;
                elementsToDistribute.forEach((element, index) => {
                    if (index > 0) {
                        currentY += elementsToDistribute[index - 1].transform.height + gap;
                    }
                    const elementIndex = updatedElements.findIndex(el => el.id === element.id);
                    if (elementIndex !== -1) {
                        updatedElements[elementIndex] = {
                            ...element,
                            transform: { ...element.transform, y: currentY },
                        };
                    }
                });
            }

            return {
                masterLabel: {
                    ...state.masterLabel,
                    elements: updatedElements,
                },
            };
        });
    },

    alignElementsToLabel: (elementIds: string[], alignment: 'left' | 'right' | 'centerH' | 'top' | 'bottom' | 'centerV') => {
        set((state: DesignStore) => {
            if (elementIds.length === 0) return state;

            const elementsToAlign = state.masterLabel.elements.filter((el: DesignElement) =>
                elementIds.includes(el.id)
            );

            if (elementsToAlign.length === 0) return state;

            const labelWidth = state.template.labelWidth;
            const labelHeight = state.template.labelHeight;

            const updatedElements = [...state.masterLabel.elements];

            elementsToAlign.forEach((element) => {
                const index = updatedElements.findIndex(el => el.id === element.id);
                if (index === -1) return;

                const newTransform = { ...element.transform };

                if (alignment === 'left') {
                    newTransform.x = 0;
                } else if (alignment === 'right') {
                    newTransform.x = labelWidth - element.transform.width;
                } else if (alignment === 'centerH') {
                    newTransform.x = (labelWidth - element.transform.width) / 2;
                } else if (alignment === 'top') {
                    newTransform.y = 0;
                } else if (alignment === 'bottom') {
                    newTransform.y = labelHeight - element.transform.height;
                } else if (alignment === 'centerV') {
                    newTransform.y = (labelHeight - element.transform.height) / 2;
                }

                updatedElements[index] = { ...element, transform: newTransform };
            });

            return {
                masterLabel: {
                    ...state.masterLabel,
                    elements: updatedElements,
                },
            };
        });
    },

            // History actions - will be overridden after store creation
            undo: () => {
                // This will be replaced
            },

            redo: () => {
                // This will be replaced
            },
            
            // Getters for canUndo/canRedo that read from temporal store
            get canUndo() {
                try {
                    const temporalStore = useDesignStore.temporal;
                    return temporalStore.getState().pastStates.length > 0;
                } catch {
                    return false;
                }
            },
            
            get canRedo() {
                try {
                    const temporalStore = useDesignStore.temporal;
                    return temporalStore.getState().futureStates.length > 0;
                } catch {
                    return false;
                }
            },
});

// Create store with temporal middleware for undo/redo
export const useDesignStore = create<DesignStore>()(
    temporal(
        devtools(storeCreator, { name: 'DesignStore' }),
        {
            limit: 50, // Keep last 50 states
            partialize: (state) => ({
                // Only track these fields for undo/redo (exclude view state like zoom/pan)
                template: state.template,
                masterLabel: state.masterLabel,
                labelOverrides: state.labelOverrides,
                // Don't track selection/zoom/pan as they're UI state
            }),
        }
    )
);

// Get temporal store reference
const getTemporalStore = () => useDesignStore.temporal;

// Override undo/redo methods after store creation
useDesignStore.setState({
    undo: () => {
        const temporalStore = getTemporalStore();
        temporalStore.getState().undo();
    },
    redo: () => {
        const temporalStore = getTemporalStore();
        temporalStore.getState().redo();
    },
});

// ============================================================================
// Helper Functions for Creating Elements
// ============================================================================

let elementIdCounter = 0;

export function generateElementId(): string {
    return `element-${Date.now()}-${elementIdCounter++}`;
}

export function createTextElement(
    x: number,
    y: number,
    content: string = 'Text'
): TextElement {
    return {
        id: generateElementId(),
        type: 'text',
        transform: {
            x,
            y,
            width: 50,
            height: 10,
            rotation: 0,
        },
        zIndex: 0, // Will be set by addElementToMaster
        visible: true,
        locked: false,
        content,
        fontFamily: 'Arial',
        fontSize: 12,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
        color: '#000000',
        lineHeight: 1.2,
        letterSpacing: 0,
        bindings: [],
    };
}

export function createImageElement(
    x: number,
    y: number,
    src: string,
    originalWidth: number,
    originalHeight: number
): ImageElement {
    return {
        id: generateElementId(),
        type: 'image',
        transform: {
            x,
            y,
            width: 25,
            height: 25,
            rotation: 0,
        },
        zIndex: 0,
        visible: true,
        locked: false,
        src,
        originalWidth,
        originalHeight,
        cropX: 0,
        cropY: 0,
        cropWidth: 1,
        cropHeight: 1,
        maintainAspectRatio: true,
    };
}

export function createShapeElement(
    x: number,
    y: number,
    shapeType: 'rectangle' | 'circle' | 'line' = 'rectangle'
): ShapeElement {
    return {
        id: generateElementId(),
        type: 'shape',
        shapeType,
        transform: {
            x,
            y,
            width: 20,
            height: 20,
            rotation: 0,
        },
        zIndex: 0,
        visible: true,
        locked: false,
        fillColor: '#cccccc',
        strokeColor: '#000000',
        strokeWidth: 0.5,
        cornerRadius: 0,
        opacity: 1,
    };
}

export function createPlaceholderElement(
    x: number,
    y: number,
    placeholderType: 'image' | 'qrCode' = 'image',
    imageName?: string
): PlaceholderElement {
    return {
        id: generateElementId(),
        type: 'placeholder',
        placeholderType,
        transform: {
            x,
            y,
            width: 25,
            height: 25,
            rotation: 0,
        },
        zIndex: 0,
        visible: true,
        locked: false,
        imageName: placeholderType === 'image' ? (imageName || 'image-name') : undefined,
        imageFit: placeholderType === 'image' ? 'fitHorizontal' : undefined,
        qrValueBinding: placeholderType === 'qrCode' ? undefined : undefined,
        displayText: placeholderType === 'image' ? (imageName || 'Image') : 'QR Code',
        fillColor: '#f0f0f0',
        strokeColor: '#999999',
        strokeWidth: 1,
        opacity: 1,
    };
}
