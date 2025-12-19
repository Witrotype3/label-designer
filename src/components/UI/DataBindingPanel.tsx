'use client';

import React from 'react';
import { useDataStore } from '@/store/dataStore';
import type { ElementBinding } from '@/types';
import styles from '@/styles/ui.module.css';

interface DataBindingPanelProps {
    bindings: ElementBinding[];
    onBindingsChange: (bindings: ElementBinding[]) => void;
    availableProperties: string[]; // e.g., ['content', 'color']
}

export default function DataBindingPanel({
    bindings,
    onBindingsChange,
    availableProperties,
}: DataBindingPanelProps) {
    const { columns } = useDataStore();

    const updateBinding = (property: string, columnId: string | null) => {
        const newBindings = bindings.filter((b) => b.property !== property);
        if (columnId) {
            newBindings.push({ property, columnId });
        }
        onBindingsChange(newBindings);
    };

    const getBindingForProperty = (property: string): ElementBinding | null => {
        return bindings.find((b) => b.property === property) || null;
    };

    return (
        <div className={styles.propertySection}>
            <div className={styles.sidebarTitle}>Data Bindings</div>
            {availableProperties.map((property) => {
                const binding = getBindingForProperty(property);
                const boundColumnId = binding?.columnId || null;

                return (
                    <div key={property} className={styles.propertyRow}>
                        <label className={styles.propertyLabel}>
                            {property.charAt(0).toUpperCase() + property.slice(1)}
                        </label>
                        <select
                            className={styles.propertyInput}
                            value={boundColumnId || ''}
                            onChange={(e) => updateBinding(property, e.target.value || null)}
                        >
                            <option value="">None</option>
                            {columns.map((col) => (
                                <option key={col.id} value={col.id}>
                                    {col.name}
                                </option>
                            ))}
                        </select>
                        {boundColumnId && (
                            <button
                                className="btn btn-ghost"
                                onClick={() => updateBinding(property, null)}
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                                title="Unbind"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                );
            })}
            {bindings.length === 0 && (
                <div style={{ fontSize: '12px', color: '#999', padding: '8px' }}>
                    No bindings. Select a column to bind to a property.
                </div>
            )}
        </div>
    );
}

