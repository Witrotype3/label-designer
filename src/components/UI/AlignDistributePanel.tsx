'use client';

import React from 'react';
import { useDesignStore } from '@/store/designStore';
import styles from '@/styles/ui.module.css';

export default function AlignDistributePanel() {
    const { selectedElementIds, alignElements, distributeElements } = useDesignStore();

    if (selectedElementIds.length < 2) {
        return null;
    }

    return (
        <div className={styles.propertySection}>
            <div className={styles.sidebarTitle}>Align & Distribute</div>
            
            <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Align</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <button
                        className="btn btn-ghost"
                        onClick={() => alignElements(selectedElementIds, 'left')}
                        style={{ fontSize: '11px', padding: '4px 8px', flex: '1 1 auto', minWidth: '60px' }}
                        title="Align Left"
                    >
                        ⬅ Left
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => alignElements(selectedElementIds, 'center')}
                        style={{ fontSize: '11px', padding: '4px 8px', flex: '1 1 auto', minWidth: '60px' }}
                        title="Align Center (Horizontal)"
                    >
                        ↔ Center
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => alignElements(selectedElementIds, 'right')}
                        style={{ fontSize: '11px', padding: '4px 8px', flex: '1 1 auto', minWidth: '60px' }}
                        title="Align Right"
                    >
                        ➡ Right
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => alignElements(selectedElementIds, 'top')}
                        style={{ fontSize: '11px', padding: '4px 8px', flex: '1 1 auto', minWidth: '60px' }}
                        title="Align Top"
                    >
                        ⬆ Top
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => alignElements(selectedElementIds, 'middle')}
                        style={{ fontSize: '11px', padding: '4px 8px', flex: '1 1 auto', minWidth: '60px' }}
                        title="Align Middle (Vertical)"
                    >
                        ↕ Middle
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => alignElements(selectedElementIds, 'bottom')}
                        style={{ fontSize: '11px', padding: '4px 8px', flex: '1 1 auto', minWidth: '60px' }}
                        title="Align Bottom"
                    >
                        ⬇ Bottom
                    </button>
                </div>
            </div>

            {selectedElementIds.length >= 3 && (
                <div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Distribute</div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            className="btn btn-ghost"
                            onClick={() => distributeElements(selectedElementIds, 'horizontal')}
                            style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}
                            title="Distribute Horizontally"
                        >
                            ↔ Distribute H
                        </button>
                        <button
                            className="btn btn-ghost"
                            onClick={() => distributeElements(selectedElementIds, 'vertical')}
                            style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}
                            title="Distribute Vertically"
                        >
                            ↕ Distribute V
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

