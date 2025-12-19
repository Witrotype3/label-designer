'use client';

import React, { useState, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import type { DesignElement } from '@/types';
import styles from '@/styles/ui.module.css';

function getElementLabel(element: DesignElement): string {
    switch (element.type) {
        case 'text':
            const textContent = element.content || '';
            return textContent.length > 20 ? textContent.substring(0, 20) + '...' : textContent || 'Text';
        case 'image':
            return 'Image';
        case 'shape':
            return element.shapeType ? element.shapeType.charAt(0).toUpperCase() + element.shapeType.slice(1) : 'Shape';
        default:
            return 'Element';
    }
}

function getElementIcon(element: DesignElement): string {
    switch (element.type) {
        case 'text':
            return '📝';
        case 'image':
            return '📷';
        case 'shape':
            return '⬜';
        default:
            return '📦';
    }
}

interface LayerItemProps {
    element: DesignElement;
    isSelected: boolean;
    isTop: boolean;
    isBottom: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onToggleVisibility: () => void;
    onToggleLock: () => void;
    onBringToFront: () => void;
    onSendToBack: () => void;
    onBringForward: () => void;
    onSendBackward: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    isDragging: boolean;
    dragOver: boolean;
}

function LayerItem({
    element,
    isSelected,
    isTop,
    isBottom,
    onSelect,
    onToggleVisibility,
    onToggleLock,
    onBringToFront,
    onSendToBack,
    onBringForward,
    onSendBackward,
    onDragStart,
    onDragOver,
    onDrop,
    isDragging,
    dragOver,
}: LayerItemProps) {
    const label = getElementLabel(element);
    const icon = getElementIcon(element);

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={(e) => onSelect(e)}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 8px',
                background: isSelected ? '#e0f2ff' : dragOver ? '#f0f0f0' : 'transparent',
                border: isSelected ? '1px solid #2563eb' : '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '2px',
                opacity: element.visible ? 1 : 0.5,
                position: 'relative',
            }}
        >
            {/* Drag handle */}
            <div
                style={{
                    cursor: 'grab',
                    marginRight: '8px',
                    fontSize: '12px',
                    color: '#999',
                    userSelect: 'none',
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                ⋮⋮
            </div>

            {/* Visibility toggle */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility();
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px',
                    marginRight: '4px',
                }}
                title={element.visible ? 'Hide' : 'Show'}
            >
                {element.visible ? '👁️' : '🚫'}
            </button>

            {/* Lock toggle */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock();
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px',
                    marginRight: '4px',
                }}
                title={element.locked ? 'Unlock' : 'Lock'}
            >
                {element.locked ? '🔒' : '🔓'}
            </button>

            {/* Element icon and label */}
            <span style={{ marginRight: '8px', fontSize: '16px' }}>{icon}</span>
            <span style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
            </span>

            {/* Layer action buttons */}
            <div
                style={{
                    display: 'flex',
                    gap: '2px',
                    opacity: isSelected ? 1 : 0,
                    transition: 'opacity 0.2s',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {!isTop && (
                    <button
                        onClick={onBringToFront}
                        className="btn btn-ghost"
                        style={{ fontSize: '10px', padding: '2px 4px', minWidth: 'auto' }}
                        title="Bring to Front"
                    >
                        ⬆⬆
                    </button>
                )}
                {!isTop && (
                    <button
                        onClick={onBringForward}
                        className="btn btn-ghost"
                        style={{ fontSize: '10px', padding: '2px 4px', minWidth: 'auto' }}
                        title="Bring Forward"
                    >
                        ⬆
                    </button>
                )}
                {!isBottom && (
                    <button
                        onClick={onSendBackward}
                        className="btn btn-ghost"
                        style={{ fontSize: '10px', padding: '2px 4px', minWidth: 'auto' }}
                        title="Send Backward"
                    >
                        ⬇
                    </button>
                )}
                {!isBottom && (
                    <button
                        onClick={onSendToBack}
                        className="btn btn-ghost"
                        style={{ fontSize: '10px', padding: '2px 4px', minWidth: 'auto' }}
                        title="Send to Back"
                    >
                        ⬇⬇
                    </button>
                )}
            </div>
        </div>
    );
}

export default function LayersPanel() {
    const {
        masterLabel,
        selectedElementIds,
        setSelectedElements,
        updateMasterElement,
        bringToFront,
        sendToBack,
        bringForward,
        sendBackward,
        reorderElements,
    } = useDesignStore();

    const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
    const [dragOverElementId, setDragOverElementId] = useState<string | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Sort elements by zIndex (descending - topmost first for display)
    const sortedElements = useMemo(() => {
        return [...masterLabel.elements].sort((a, b) => b.zIndex - a.zIndex);
    }, [masterLabel.elements]);

    const handleSelect = (elementId: string, e: React.MouseEvent) => {
        if (e.shiftKey) {
            // Multi-select
            if (selectedElementIds.includes(elementId)) {
                setSelectedElements(selectedElementIds.filter(id => id !== elementId));
            } else {
                setSelectedElements([...selectedElementIds, elementId]);
            }
        } else {
            // Single select
            setSelectedElements([elementId]);
        }
    };

    const handleToggleVisibility = (elementId: string) => {
        const element = masterLabel.elements.find(el => el.id === elementId);
        if (element) {
            updateMasterElement(elementId, { visible: !element.visible });
        }
    };

    const handleToggleLock = (elementId: string) => {
        const element = masterLabel.elements.find(el => el.id === elementId);
        if (element) {
            updateMasterElement(elementId, { locked: !element.locked });
        }
    };

    const handleDragStart = (e: React.DragEvent, elementId: string) => {
        setDraggedElementId(elementId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', elementId);
    };

    const handleDragOver = (e: React.DragEvent, elementId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedElementId && draggedElementId !== elementId) {
            setDragOverElementId(elementId);
        }
    };

    const handleDrop = (e: React.DragEvent, dropElementId: string) => {
        e.preventDefault();
        if (!draggedElementId || draggedElementId === dropElementId) {
            setDraggedElementId(null);
            setDragOverElementId(null);
            return;
        }

        // Find current positions
        const draggedIndex = sortedElements.findIndex(el => el.id === draggedElementId);
        const dropIndex = sortedElements.findIndex(el => el.id === dropElementId);

        if (draggedIndex === -1 || dropIndex === -1) {
            setDraggedElementId(null);
            setDragOverElementId(null);
            return;
        }

        // Create new order
        const newOrder = [...sortedElements];
        const [dragged] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(dropIndex, 0, dragged);

        // Reorder by element IDs
        const elementIds = newOrder.map(el => el.id);
        reorderElements(elementIds);

        setDraggedElementId(null);
        setDragOverElementId(null);
    };

    const handleDragEnd = () => {
        setDraggedElementId(null);
        setDragOverElementId(null);
    };

    if (isCollapsed) {
        return (
            <div className={styles.sidebarSection}>
                <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setIsCollapsed(false)}
                >
                    <div className={styles.sidebarTitle}>Layers ({sortedElements.length})</div>
                    <span style={{ fontSize: '12px' }}>▶</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.sidebarSection}>
            <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}
            >
                <div className={styles.sidebarTitle}>Layers ({sortedElements.length})</div>
                <button
                    onClick={() => setIsCollapsed(true)}
                    className="btn btn-ghost"
                    style={{ fontSize: '12px', padding: '2px 6px' }}
                    title="Collapse"
                >
                    ▼
                </button>
            </div>

            {sortedElements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>
                    No elements. Add elements to see them here.
                </div>
            ) : (
                <div
                    style={{ maxHeight: '400px', overflowY: 'auto' }}
                    onDragEnd={handleDragEnd}
                >
                    {sortedElements.map((element, index) => {
                        const isTop = index === 0;
                        const isBottom = index === sortedElements.length - 1;
                        const isSelected = selectedElementIds.includes(element.id);
                        const isDragging = draggedElementId === element.id;
                        const dragOver = dragOverElementId === element.id;

                        return (
                            <LayerItem
                                key={element.id}
                                element={element}
                                isSelected={isSelected}
                                isTop={isTop}
                                isBottom={isBottom}
                                onSelect={(e) => handleSelect(element.id, e)}
                                onToggleVisibility={() => handleToggleVisibility(element.id)}
                                onToggleLock={() => handleToggleLock(element.id)}
                                onBringToFront={() => bringToFront(element.id)}
                                onSendToBack={() => sendToBack(element.id)}
                                onBringForward={() => bringForward(element.id)}
                                onSendBackward={() => sendBackward(element.id)}
                                onDragStart={(e) => handleDragStart(e, element.id)}
                                onDragOver={(e) => handleDragOver(e, element.id)}
                                onDrop={(e) => handleDrop(e, element.id)}
                                isDragging={isDragging}
                                dragOver={dragOver}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

