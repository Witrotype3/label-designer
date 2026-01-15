'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDesignStore } from '@/store/designStore';
import type { DesignElement, TextElement, ShapeElement, PlaceholderElement, ElementBinding } from '@/types';
import { getAllAssets, initializeAssets } from '@/lib/assets';
import { useDataStore } from '@/store/dataStore';
import { hideElement } from '@/lib/masterOverride';
import Resizable from './Resizable';
import ColorInput from './ColorInput';
import DataBindingPanel from './DataBindingPanel';
import AlignDistributePanel from './AlignDistributePanel';
import styles from '@/styles/ui.module.css';

// Helper component for number inputs that preserve cursor position
function NumberInput({
    value,
    onChange,
    step = '0.1',
    min,
    max,
    ...props
}: {
    value: number;
    onChange: (value: number) => void;
    step?: string;
    min?: string;
    max?: string;
    [key: string]: any;
}) {
    const [localValue, setLocalValue] = useState<string>(value.toString());
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const cursorPositionRef = useRef<number | null>(null);

    // Update local value when prop value changes (but not while focused)
    useEffect(() => {
        if (!isFocused) {
            setLocalValue(value.toFixed(step === '1' ? 0 : 1));
        }
    }, [value, isFocused, step]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        cursorPositionRef.current = e.target.selectionStart;
        
        // Parse and update immediately for better UX
        const parsed = parseFloat(newValue);
        if (!isNaN(parsed)) {
            onChange(parsed);
        }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        setLocalValue(value.toString());
        cursorPositionRef.current = e.target.selectionStart;
    };

    const handleBlur = () => {
        setIsFocused(false);
        const parsed = parseFloat(localValue);
        if (!isNaN(parsed)) {
            onChange(parsed);
            setLocalValue(parsed.toFixed(step === '1' ? 0 : 1));
        } else {
            setLocalValue(value.toFixed(step === '1' ? 0 : 1));
        }
    };

    // Restore cursor position after render
    useEffect(() => {
        if (isFocused && inputRef.current && cursorPositionRef.current !== null) {
            inputRef.current.setSelectionRange(cursorPositionRef.current, cursorPositionRef.current);
        }
    });

    return (
        <input
            {...props}
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            step={step}
            min={min}
            max={max}
        />
    );
}

export default function PropertyPanel() {
    const {
        selectedElementIds,
        masterLabel,
        updateMasterElement,
        removeMasterElement,
        clearSelection,
        alignElementsToLabel,
        viewMode,
        selectedLabelIndex,
        getEffectiveElementsForLabel,
        updateLabelElement,
        labelOverrides,
        setLabelOverride,
        previewPageIndex,
        template
    } = useDesignStore();
    const { columns } = useDataStore();
    const [assets, setAssets] = useState<Array<{ id: string; name: string }>>([]);

    // Load assets on mount
    useEffect(() => {
        const loadAssets = async () => {
            try {
                await initializeAssets();
                const loadedAssets = await getAllAssets();
                setAssets(loadedAssets);
            } catch (error) {
                console.error('Failed to load assets:', error);
            }
        };
        loadAssets();
    }, []);

    if (selectedElementIds.length === 0) {
        return (
            <Resizable side="right" defaultWidth={320} minWidth={250} maxWidth={600}>
                <div className={styles.propertyPanel} style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <div className={styles.emptyState}>
                        <div className={styles.emptyStateIcon}>⚙️</div>
                        <div className={styles.emptyStateText}>
                            Select an element to edit its properties
                        </div>
                    </div>
                </div>
            </Resizable>
        );
    }

    // Get the effective element (with overrides applied) when in preview mode with label selected
    // Otherwise, get from master label
    let selectedElement: DesignElement | undefined;
    if (viewMode === 'PREVIEW' && selectedLabelIndex !== null) {
        const effectiveElements = getEffectiveElementsForLabel(selectedLabelIndex);
        selectedElement = effectiveElements.find(el => el.id === selectedElementIds[0]);
    } else {
        selectedElement = masterLabel.elements.find(el => el.id === selectedElementIds[0]);
    }

    if (!selectedElement) {
        return (
            <Resizable side="right" defaultWidth={320} minWidth={250} maxWidth={600} backgroundColor="var(--color-bg-secondary)">
                <div className={styles.propertyPanel}>
                    <div className={styles.emptyState}>
                        <div className={styles.emptyStateText}>Element not found</div>
                    </div>
                </div>
            </Resizable>
        );
    }

    const handleUpdate = (updates: Partial<DesignElement>) => {
        if (viewMode === 'PREVIEW' && selectedLabelIndex !== null) {
            // Validate that selectedLabelIndex is reasonable (not from a previous page)
            // This is a safeguard - the click handler should set it correctly, but this prevents editing wrong labels
            const labelsPerPage = template.rows * template.columns;
            const currentPageStartIndex = previewPageIndex * labelsPerPage;
            const currentPageEndIndex = currentPageStartIndex + labelsPerPage - 1;
            
            // Only update if the selected label is on the current page
            if (selectedLabelIndex >= currentPageStartIndex && selectedLabelIndex <= currentPageEndIndex) {
                // In preview mode with label selected, update label-specific override
                updateLabelElement(selectedLabelIndex, selectedElement.id, updates);
            } else {
                // Label index is from a different page - clear selection and don't update
                console.warn(`Selected label index ${selectedLabelIndex} is not on current page ${previewPageIndex} (range: ${currentPageStartIndex}-${currentPageEndIndex}). Clearing selection.`);
                clearSelection();
            }
        } else {
            // In template mode, update master label
            updateMasterElement(selectedElement.id, updates);
        }
    };

    const handleBindingsChange = (bindings: ElementBinding[]) => {
        if (selectedElement.type === 'text') {
            handleUpdate({ bindings } as Partial<TextElement>);
        }
    };

    const handleDelete = () => {
        if (viewMode === 'PREVIEW' && selectedLabelIndex !== null) {
            // In preview mode with label selected, hide the element instead of deleting
            const existingOverride = labelOverrides.get(selectedLabelIndex);
            const newOverride = hideElement(selectedLabelIndex, selectedElement.id, existingOverride);
            setLabelOverride(selectedLabelIndex, newOverride);
            clearSelection();
        } else {
            // In template mode, delete from master
            removeMasterElement(selectedElement.id);
            clearSelection();
        }
    };

    return (
        <Resizable side="right" defaultWidth={320} minWidth={250} maxWidth={600} backgroundColor="var(--color-bg-secondary)">
            <div className={styles.propertyPanel}>
                {/* Align & Distribute Section (only shown when multiple elements selected) */}
                <AlignDistributePanel />

                {/* Transform Section */}
                <div className={styles.propertySection}>
                    <div className={styles.sidebarTitle}>Transform</div>

                    <div className={styles.propertyRow}>
                        <label className={styles.propertyLabel}>X</label>
                        <NumberInput
                            className={styles.propertyInput}
                            value={selectedElement.transform.x}
                            onChange={(val) => handleUpdate({
                                transform: { ...selectedElement.transform, x: val }
                            })}
                            step="0.1"
                        />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>mm</span>
                    </div>

                    <div className={styles.propertyRow}>
                        <label className={styles.propertyLabel}>Y</label>
                        <NumberInput
                            className={styles.propertyInput}
                            value={selectedElement.transform.y}
                            onChange={(val) => handleUpdate({
                                transform: { ...selectedElement.transform, y: val }
                            })}
                            step="0.1"
                        />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>mm</span>
                    </div>

                    <div className={styles.propertyRow}>
                        <label className={styles.propertyLabel}>Width</label>
                        <NumberInput
                            className={styles.propertyInput}
                            value={selectedElement.transform.width}
                            onChange={(val) => handleUpdate({
                                transform: { ...selectedElement.transform, width: Math.max(0.1, val) }
                            })}
                            step="0.1"
                            min="0.1"
                        />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>mm</span>
                    </div>

                    <div className={styles.propertyRow}>
                        <label className={styles.propertyLabel}>Height</label>
                        <NumberInput
                            className={styles.propertyInput}
                            value={selectedElement.transform.height}
                            onChange={(val) => handleUpdate({
                                transform: { ...selectedElement.transform, height: Math.max(0.1, val) }
                            })}
                            step="0.1"
                            min="0.1"
                        />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>mm</span>
                    </div>

                    <div className={styles.propertyRow}>
                        <label className={styles.propertyLabel}>Rotation</label>
                        <NumberInput
                            className={styles.propertyInput}
                            value={selectedElement.transform.rotation}
                            onChange={(val) => handleUpdate({
                                transform: { ...selectedElement.transform, rotation: val }
                            })}
                            step="1"
                        />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>°</span>
                    </div>

                    <div className={styles.propertyRow}>
                        <label className={styles.propertyLabel}>Align to Label</label>
                        <div className={styles.propertyGroup} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            <button
                                className="btn btn-ghost"
                                onClick={() => alignElementsToLabel(selectedElementIds, 'left')}
                                style={{ flex: '1 1 auto', minWidth: '60px', fontSize: '11px', padding: '4px 8px' }}
                                title="Align Left"
                            >
                                ⬅ Left
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={() => alignElementsToLabel(selectedElementIds, 'centerH')}
                                style={{ flex: '1 1 auto', minWidth: '60px', fontSize: '11px', padding: '4px 8px' }}
                                title="Align Center (Horizontal)"
                            >
                                ↔ Center H
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={() => alignElementsToLabel(selectedElementIds, 'right')}
                                style={{ flex: '1 1 auto', minWidth: '60px', fontSize: '11px', padding: '4px 8px' }}
                                title="Align Right"
                            >
                                ➡ Right
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={() => alignElementsToLabel(selectedElementIds, 'top')}
                                style={{ flex: '1 1 auto', minWidth: '60px', fontSize: '11px', padding: '4px 8px' }}
                                title="Align Top"
                            >
                                ⬆ Top
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={() => alignElementsToLabel(selectedElementIds, 'centerV')}
                                style={{ flex: '1 1 auto', minWidth: '60px', fontSize: '11px', padding: '4px 8px' }}
                                title="Align Center (Vertical)"
                            >
                                ↕ Center V
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={() => alignElementsToLabel(selectedElementIds, 'bottom')}
                                style={{ flex: '1 1 auto', minWidth: '60px', fontSize: '11px', padding: '4px 8px' }}
                                title="Align Bottom"
                            >
                                ⬇ Bottom
                            </button>
                        </div>
                    </div>
                </div>

                {/* Text Properties */}
                {selectedElement.type === 'text' && (
                    <div className={styles.propertySection}>
                        <div className={styles.sidebarTitle}>Text</div>

                        <div className={styles.propertyRow}>
                            <label className={styles.propertyLabel}>Content</label>
                            <textarea
                                className={styles.propertyInput}
                                value={(selectedElement as TextElement).content}
                                onChange={(e) => handleUpdate({ content: e.target.value } as Partial<TextElement>)}
                                rows={3}
                                style={{ resize: 'vertical', width: '100%' }}
                            />
                        </div>

                        <div className={styles.propertyRow}>
                            <label className={styles.propertyLabel}>Font Size</label>
                            <NumberInput
                                className={styles.propertyInput}
                                value={(selectedElement as TextElement).fontSize}
                                onChange={(val) => handleUpdate({ fontSize: Math.round(val) } as Partial<TextElement>)}
                                step="1"
                                min="6"
                                max="72"
                            />
                            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>pt</span>
                        </div>

                        <div className={styles.propertyRow}>
                            <label className={styles.propertyLabel}>Font Family</label>
                            <select
                                className={styles.propertyInput}
                                value={(selectedElement as TextElement).fontFamily}
                                onChange={(e) => handleUpdate({ fontFamily: e.target.value } as Partial<TextElement>)}
                            >
                                <option value="Arial">Arial</option>
                                <option value="Times New Roman">Times New Roman</option>
                                <option value="Courier New">Courier New</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Verdana">Verdana</option>
                            </select>
                        </div>

                        <ColorInput
                            label="Color"
                            value={(selectedElement as TextElement).color}
                            onChange={(value) => handleUpdate({ color: value } as Partial<TextElement>)}
                        />

                        <div className={styles.propertyRow}>
                            <label className={styles.propertyLabel}>Align</label>
                            <div className={styles.propertyGroup}>
                                {(['left', 'center', 'right'] as const).map(align => (
                                    <button
                                        key={align}
                                        className={`btn btn-ghost ${(selectedElement as TextElement).textAlign === align ? 'btn-primary' : ''}`}
                                        onClick={() => handleUpdate({ textAlign: align } as Partial<TextElement>)}
                                        style={{ flex: 1 }}
                                    >
                                        {align[0].toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Data Bindings */}
                        <DataBindingPanel
                            bindings={(selectedElement as TextElement).bindings || []}
                            onBindingsChange={handleBindingsChange}
                            availableProperties={['content']}
                        />
                    </div>
                )}

                {/* Shape Properties */}
                {selectedElement.type === 'shape' && (
                    <div className={styles.propertySection}>
                        <div className={styles.sidebarTitle}>Shape</div>

                        <ColorInput
                            label="Fill"
                            value={(selectedElement as ShapeElement).fillColor}
                            onChange={(value) => handleUpdate({ fillColor: value } as Partial<ShapeElement>)}
                        />

                        <ColorInput
                            label="Stroke"
                            value={(selectedElement as ShapeElement).strokeColor}
                            onChange={(value) => handleUpdate({ strokeColor: value } as Partial<ShapeElement>)}
                        />

                        <div className={styles.propertyRow}>
                            <label className={styles.propertyLabel}>Stroke Width</label>
                            <NumberInput
                                className={styles.propertyInput}
                                value={(selectedElement as ShapeElement).strokeWidth}
                                onChange={(val) => handleUpdate({ strokeWidth: Math.max(0, val) } as Partial<ShapeElement>)}
                                step="0.1"
                                min="0"
                            />
                            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>mm</span>
                        </div>

                        <div className={styles.propertyRow}>
                            <label className={styles.propertyLabel}>Opacity</label>
                            <input
                                type="range"
                                className={styles.propertyInput}
                                value={(selectedElement as ShapeElement).opacity}
                                onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) } as Partial<ShapeElement>)}
                                min="0"
                                max="1"
                                step="0.1"
                            />
                            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', minWidth: '40px' }}>
                                {Math.round((selectedElement as ShapeElement).opacity * 100)}%
                            </span>
                        </div>

                        {(selectedElement as ShapeElement).shapeType === 'rectangle' && (
                            <div className={styles.propertyRow}>
                                <label className={styles.propertyLabel}>Corner Radius</label>
                                <NumberInput
                                    className={styles.propertyInput}
                                    value={(selectedElement as ShapeElement).cornerRadius || 0}
                                    onChange={(val) => handleUpdate({ cornerRadius: Math.max(0, val) } as Partial<ShapeElement>)}
                                    step="0.5"
                                    min="0"
                                />
                                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>mm</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Placeholder Properties */}
                {selectedElement.type === 'placeholder' && (
                    <div className={styles.propertySection}>
                        <div className={styles.sidebarTitle}>Placeholder</div>

                        <div className={styles.propertyRow}>
                            <label className={styles.propertyLabel}>Type</label>
                            <select
                                className={styles.propertyInput}
                                value={(selectedElement as PlaceholderElement).placeholderType}
                                onChange={(e) => handleUpdate({ placeholderType: e.target.value as 'image' | 'qrCode' } as Partial<PlaceholderElement>)}
                            >
                                <option value="image">Image</option>
                                <option value="qrCode">QR Code</option>
                            </select>
                        </div>

                        {(selectedElement as PlaceholderElement).placeholderType === 'image' && (
                            <>
                                <div className={styles.propertyRow}>
                                    <label className={styles.propertyLabel}>Image Name (Data Binding)</label>
                                    <select
                                        className={styles.propertyInput}
                                        value={(selectedElement as PlaceholderElement).imageNameBinding?.columnId || ''}
                                        onChange={(e) => {
                                            const binding: ElementBinding | undefined = e.target.value 
                                                ? { property: 'imageName', columnId: e.target.value }
                                                : undefined;
                                            handleUpdate({ imageNameBinding: binding } as Partial<PlaceholderElement>);
                                        }}
                                    >
                                        <option value="">None (use static image name)</option>
                                        {columns.map((col: { id: string; name: string }) => (
                                            <option key={col.id} value={col.id}>{col.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {!(selectedElement as PlaceholderElement).imageNameBinding && (
                                    <div className={styles.propertyRow}>
                                        <label className={styles.propertyLabel}>Image Name (Static)</label>
                                        <select
                                            className={styles.propertyInput}
                                            value={(selectedElement as PlaceholderElement).imageName || ''}
                                            onChange={(e) => handleUpdate({ imageName: e.target.value } as Partial<PlaceholderElement>)}
                                        >
                                            <option value="">Select image...</option>
                                            {assets.map(asset => (
                                                <option key={asset.id} value={asset.name}>{asset.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className={styles.propertyRow}>
                                    <label className={styles.propertyLabel}>Image Fit</label>
                                    <select
                                        className={styles.propertyInput}
                                        value={(selectedElement as PlaceholderElement).imageFit || 'fitHorizontal'}
                                        onChange={(e) => handleUpdate({ imageFit: e.target.value as 'fitVertical' | 'fitHorizontal' | 'stretch' } as Partial<PlaceholderElement>)}
                                    >
                                        <option value="fitHorizontal">Fit Width</option>
                                        <option value="fitVertical">Fit Height</option>
                                        <option value="stretch">Stretch to Fill</option>
                                    </select>
                                </div>
                                <div className={styles.propertyRow}>
                                    <label className={styles.propertyLabel}>Display Text</label>
                                    <input
                                        type="text"
                                        className={styles.propertyInput}
                                        value={(selectedElement as PlaceholderElement).displayText}
                                        onChange={(e) => handleUpdate({ displayText: e.target.value } as Partial<PlaceholderElement>)}
                                    />
                                </div>
                            </>
                        )}

                        {(selectedElement as PlaceholderElement).placeholderType === 'qrCode' && (
                            <>
                                <div className={styles.propertyRow}>
                                    <label className={styles.propertyLabel}>QR Value (Data Binding)</label>
                                    <select
                                        className={styles.propertyInput}
                                        value={(selectedElement as PlaceholderElement).qrValueBinding?.columnId || ''}
                                        onChange={(e) => {
                                            const bindings: ElementBinding[] = e.target.value 
                                                ? [{ property: 'qrValue', columnId: e.target.value }]
                                                : [];
                                            handleUpdate({ qrValueBinding: bindings[0] } as Partial<PlaceholderElement>);
                                        }}
                                    >
                                        <option value="">None (use display text)</option>
                                        {columns.map((col: { id: string; name: string }) => (
                                            <option key={col.id} value={col.id}>{col.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.propertyRow}>
                                    <label className={styles.propertyLabel}>Display Text</label>
                                    <input
                                        type="text"
                                        className={styles.propertyInput}
                                        value={(selectedElement as PlaceholderElement).displayText}
                                        onChange={(e) => handleUpdate({ displayText: e.target.value } as Partial<PlaceholderElement>)}
                                        placeholder="QR Code"
                                    />
                                </div>
                            </>
                        )}

                        <ColorInput
                            label="Fill"
                            value={(selectedElement as PlaceholderElement).fillColor}
                            onChange={(value) => handleUpdate({ fillColor: value } as Partial<PlaceholderElement>)}
                        />

                        <ColorInput
                            label="Stroke"
                            value={(selectedElement as PlaceholderElement).strokeColor}
                            onChange={(value) => handleUpdate({ strokeColor: value } as Partial<PlaceholderElement>)}
                        />

                        <div className={styles.propertyRow}>
                            <label className={styles.propertyLabel}>Stroke Width</label>
                            <NumberInput
                                className={styles.propertyInput}
                                value={(selectedElement as PlaceholderElement).strokeWidth}
                                onChange={(val) => handleUpdate({ strokeWidth: Math.max(0, val) } as Partial<PlaceholderElement>)}
                                step="0.1"
                                min="0"
                            />
                            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>mm</span>
                        </div>

                        <div className={styles.propertyRow}>
                            <label className={styles.propertyLabel}>Opacity</label>
                            <input
                                type="range"
                                className={styles.propertyInput}
                                value={(selectedElement as PlaceholderElement).opacity}
                                onChange={(e) => handleUpdate({ opacity: parseFloat(e.target.value) } as Partial<PlaceholderElement>)}
                                min="0"
                                max="1"
                                step="0.1"
                            />
                            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', minWidth: '40px' }}>
                                {Math.round((selectedElement as PlaceholderElement).opacity * 100)}%
                            </span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className={styles.propertySection}>
                    <button className="btn btn-secondary" onClick={handleDelete} style={{ width: '100%' }}>
                        🗑️ Delete Element
                    </button>
                </div>
            </div>
        </Resizable>
    );
}
