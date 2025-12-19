'use client';

import React, { useState } from 'react';
import { useDataStore, type DataColumn, type ColumnType } from '@/store/dataStore';
import styles from '@/styles/ui.module.css';

const COLUMN_TYPES: ColumnType[] = ['text', 'image', 'qr', 'barcode', 'number'];

interface ColumnEditorProps {
    column?: DataColumn;
    onSave: (column: DataColumn) => void;
    onCancel: () => void;
}

function ColumnEditor({ column, onSave, onCancel }: ColumnEditorProps) {
    const [name, setName] = useState(column?.name || '');
    const [type, setType] = useState<ColumnType>(column?.type || 'text');
    const [required, setRequired] = useState(column?.required ?? false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = () => {
        if (!name.trim()) {
            setError('Column name is required');
            return;
        }

        try {
            const columnData: DataColumn = {
                id: column?.id || crypto.randomUUID(),
                name: name.trim(),
                type,
                required,
            };
            onSave(columnData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save column');
        }
    };

    return (
        <div style={{
            padding: '12px',
            background: '#f9f9f9',
            borderRadius: '4px',
            marginBottom: '8px',
        }}>
            <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}>
                    Column Name
                </label>
                <input
                    type="text"
                    className={styles.propertyInput}
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setError(null);
                    }}
                    placeholder="Enter column name"
                    style={{ width: '100%' }}
                />
            </div>

            <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold' }}>
                    Type
                </label>
                <select
                    className={styles.propertyInput}
                    value={type}
                    onChange={(e) => setType(e.target.value as ColumnType)}
                    style={{ width: '100%' }}
                >
                    {COLUMN_TYPES.map(t => (
                        <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                <input
                    type="checkbox"
                    id="required-check"
                    checked={required}
                    onChange={(e) => setRequired(e.target.checked)}
                    style={{ marginRight: '8px' }}
                />
                <label htmlFor="required-check" style={{ fontSize: '12px', cursor: 'pointer' }}>
                    Required
                </label>
            </div>

            {error && (
                <div style={{
                    padding: '6px',
                    marginBottom: '8px',
                    backgroundColor: '#ffe0e0',
                    color: '#ff0000',
                    borderRadius: '4px',
                    fontSize: '11px',
                }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>
                    {column ? 'Update' : 'Add'} Column
                </button>
                <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1 }}>
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default function ColumnManager() {
    const { columns, rows, addColumn, updateColumn, removeColumn } = useDataStore();
    const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);

    const handleSave = (columnData: DataColumn) => {
        try {
            if (editingColumnId) {
                updateColumn(editingColumnId, columnData);
                setEditingColumnId(null);
            } else {
                addColumn(columnData);
                setShowAddForm(false);
            }
        } catch (error) {
            console.error('Failed to save column:', error);
            alert(error instanceof Error ? error.message : 'Failed to save column');
        }
    };

    const handleDelete = (columnId: string) => {
        const column = columns.find(c => c.id === columnId);
        if (!column) return;

        const hasData = rows.some(row => row[columnId] !== undefined && row[columnId] !== null);
        
        const message = hasData
            ? `Delete column "${column.name}"? This will remove all data in this column for all rows.`
            : `Delete column "${column.name}"?`;

        if (confirm(message)) {
            try {
                removeColumn(columnId);
            } catch (error) {
                console.error('Failed to delete column:', error);
                alert(error instanceof Error ? error.message : 'Failed to delete column');
            }
        }
    };

    const handleEdit = (columnId: string) => {
        setEditingColumnId(columnId);
        setShowAddForm(false);
    };

    const handleCancel = () => {
        setEditingColumnId(null);
        setShowAddForm(false);
    };

    return (
        <div className={styles.sidebarSection} style={{ borderTop: '1px solid #ddd', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div className={styles.sidebarTitle}>Columns ({columns.length})</div>
                {!showAddForm && !editingColumnId && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowAddForm(true)}
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                        title="Add Column"
                    >
                        + Add
                    </button>
                )}
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingColumnId) && (
                <ColumnEditor
                    column={editingColumnId ? columns.find(c => c.id === editingColumnId) : undefined}
                    onSave={handleSave}
                    onCancel={handleCancel}
                />
            )}

            {/* Column List */}
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {columns.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>
                        No columns defined
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {columns.map((column) => (
                            <div
                                key={column.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '6px 8px',
                                    background: editingColumnId === column.id ? '#e0f2ff' : '#f5f5f5',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                                        {column.name}
                                        {column.required && (
                                            <span style={{ color: '#ff0000', marginLeft: '4px' }}>*</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#666' }}>
                                        {column.type}
                                    </div>
                                </div>
                                {editingColumnId !== column.id && (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            className="btn btn-ghost"
                                            onClick={() => handleEdit(column.id)}
                                            style={{ fontSize: '11px', padding: '2px 6px' }}
                                            title="Edit Column"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn btn-ghost"
                                            onClick={() => handleDelete(column.id)}
                                            style={{ fontSize: '11px', padding: '2px 6px', color: '#ff0000' }}
                                            title="Delete Column"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

