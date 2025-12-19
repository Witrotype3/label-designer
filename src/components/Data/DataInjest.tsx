'use client';

import React, { useState, useCallback } from 'react';
import { useDataStore, DataRow, type DataColumn, type ColumnType } from '@/store/dataStore';
import ColumnManager from '@/components/UI/ColumnManager';
import { parseCSV, sanitizeColumnName, validateRowData } from '@/lib/csvParser';
import styles from '@/styles/ui.module.css';

export default function DataInjester() {
    const { columns, rows, setRows, addRow, clearData, toggleRowSelection, isRowSelected, addColumn } = useDataStore();
    const [csvInput, setCsvInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [csvError, setCsvError] = useState<string | null>(null);
    const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Map<string, string> | null>(null); // CSV header -> column ID mapping
    const [showMappingPreview, setShowMappingPreview] = useState(false);
    const [skipEmptyRows, setSkipEmptyRows] = useState(true);

    const handleParseCsv = () => {
        if (!csvInput.trim()) {
            setCsvError('Please enter CSV data');
            setCsvWarnings([]);
            return;
        }

        setCsvError(null);
        setCsvWarnings([]);

        try {
            // Parse CSV with proper handling of quoted fields
            const parseResult = parseCSV(csvInput);
            
            // Separate errors and warnings
            const errors: string[] = [];
            const warnings: string[] = [];
            
            parseResult.errors.forEach(err => {
                if (err.toLowerCase().includes('warning')) {
                    warnings.push(err);
                } else {
                    errors.push(err);
                }
            });
            
            // Show errors to user
            if (errors.length > 0) {
                setCsvError(`Parsing errors:\n${errors.join('\n')}`);
            }
            
            // Show warnings to user
            if (warnings.length > 0) {
                setCsvWarnings(warnings);
            }
            
            if (parseResult.headers.length === 0) {
                setCsvError('No headers found in CSV data. Please ensure your CSV has a header row.');
                return;
            }

            if (parseResult.rows.length === 0) {
                setCsvError('No data rows found in CSV. Please ensure your CSV contains data rows.');
                return;
            }

            const csvHeaders = parseResult.headers;

            // Build column mapping: CSV header -> column ID
            const mapping = new Map<string, string>();
            const columnsToCreate: { header: string; type: ColumnType }[] = [];
            const existingColumnNames = new Set(columns.map(c => c.name.toLowerCase()));

            csvHeaders.forEach((header) => {
                // Sanitize header name
                const sanitizedHeader = sanitizeColumnName(header, existingColumnNames);
                existingColumnNames.add(sanitizedHeader.toLowerCase());
                
                // Try to find existing column by name (case insensitive)
                const existingCol = columns.find(c => 
                    c.name.toLowerCase() === sanitizedHeader.toLowerCase() || 
                    c.id.toLowerCase() === sanitizedHeader.toLowerCase() ||
                    c.name.toLowerCase() === header.toLowerCase()
                );

                if (existingCol) {
                    mapping.set(header, existingCol.id);
                } else {
                    // Mark for dynamic creation with sanitized name
                    columnsToCreate.push({ header: sanitizedHeader, type: 'text' }); // Default to text type
                }
            });

            // If there are unmapped columns and we don't have a mapping yet, show preview
            if (columnsToCreate.length > 0 && !columnMapping) {
                setColumnMapping(mapping);
                setShowMappingPreview(true);
                return; // Wait for user to confirm/create columns
            }

            // Use provided mapping or the one we just built
            const finalMapping = columnMapping || mapping;

            // Create new columns for unmapped headers if auto-creating
            columnsToCreate.forEach(({ header, type }) => {
                if (!finalMapping.has(header)) {
                    // Find original header name if sanitized
                    const originalHeader = csvHeaders.find(h => 
                        sanitizeColumnName(h, new Set()) === header
                    ) || header;
                    
                    const newColumn: DataColumn = {
                        id: crypto.randomUUID(),
                        name: header, // Use sanitized name
                        type: type,
                        required: false,
                    };
                    try {
                        addColumn(newColumn);
                        // Map both original and sanitized header to the same column
                        finalMapping.set(originalHeader, newColumn.id);
                        finalMapping.set(header, newColumn.id);
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                        setCsvError(`Failed to create column for "${header}": ${errorMsg}`);
                        console.error(`Failed to create column for "${header}":`, error);
                    }
                }
            });

            // Process CSV with final mapping
            processCsvWithMapping(finalMapping, parseResult);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Failed to parse CSV';
            setCsvError(`Error: ${errorMsg}`);
            console.error('CSV parsing error:', error);
        }
    };

    const processCsvWithMapping = useCallback((mapping: Map<string, string>, parseResult?: { headers: string[]; rows: string[][]; errors: string[] }) => {
        const result = parseResult || parseCSV(csvInput);
        if (result.headers.length === 0 || result.rows.length === 0) return;

        const csvHeaders = result.headers;
        const newRows: DataRow[] = [];
        const validationWarnings: string[] = [];

        // Get current columns for validation
        const currentColumns = columns;

        for (let rowIndex = 0; rowIndex < result.rows.length; rowIndex++) {
            const values = result.rows[rowIndex];
            
            // Skip empty rows if option is enabled
            if (skipEmptyRows) {
                const isEmpty = values.every(v => !v || v.trim() === '');
                if (isEmpty) continue;
            }

            const row: DataRow = { id: crypto.randomUUID() };

            csvHeaders.forEach((header, index) => {
                if (index < values.length) {
                    const value = values[index];
                    const columnId = mapping.get(header);
                    if (columnId) {
                        // Find column for type validation
                        const column = currentColumns.find(c => c.id === columnId);
                        
                        // Type validation
                        if (column && value && value.trim()) {
                            if (column.type === 'number') {
                                const numValue = Number(value);
                                if (isNaN(numValue)) {
                                    validationWarnings.push(`Row ${rowIndex + 2}: Column "${column.name}" contains non-numeric value "${value}"`);
                                } else {
                                    row[columnId] = numValue;
                                }
                            } else {
                                row[columnId] = value;
                            }
                        } else if (value) {
                            row[columnId] = value;
                        }
                    }
                }
            });
            
            // Only add row if it has at least one value
            if (Object.keys(row).length > 1) { // More than just the 'id' key
                newRows.push(row);
            }
        }

        if (newRows.length === 0) {
            setCsvError('No valid data rows found after processing');
            return;
        }

        // Show validation warnings if any
        if (validationWarnings.length > 0) {
            setCsvWarnings(prev => [...prev, ...validationWarnings]);
        }

        setRows(newRows);
        setIsOpen(false);
        setCsvInput('');
        setCsvError(null);
        setCsvWarnings([]);
        setColumnMapping(null);
        setShowMappingPreview(false);
    }, [csvInput, setRows, columns, skipEmptyRows]);

    const handleCreateColumnsForUnmapped = () => {
        // Create columns for all unmapped headers
        if (!columnMapping) return;

        const parseResult = parseCSV(csvInput);
        if (parseResult.headers.length === 0) return;

        const csvHeaders = parseResult.headers;
        const updatedMapping = new Map(columnMapping);
        const existingColumnNames = new Set(columns.map(c => c.name.toLowerCase()));
        
        csvHeaders.forEach((header) => {
            if (!updatedMapping.has(header)) {
                // Sanitize column name
                const sanitizedHeader = sanitizeColumnName(header, existingColumnNames);
                existingColumnNames.add(sanitizedHeader.toLowerCase());
                
                const newColumn: DataColumn = {
                    id: crypto.randomUUID(),
                    name: sanitizedHeader, // Use sanitized name
                    type: 'text',
                    required: false,
                };
                try {
                    addColumn(newColumn);
                    updatedMapping.set(header, newColumn.id);
                    updatedMapping.set(sanitizedHeader, newColumn.id);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    setCsvError(`Failed to create column for "${header}": ${errorMsg}`);
                    console.error(`Failed to create column for "${header}":`, error);
                }
            }
        });

        // Process CSV with updated mapping
        setColumnMapping(updatedMapping);
        processCsvWithMapping(updatedMapping, parseResult);
    };

    const handleImportDemo = () => {
        const demoData = [
            { id: '1', name: 'Hammer', description: 'Heavy duty framing hammer' },
            { id: '2', name: 'Drill', description: 'Cordless 18V drill' },
            { id: '3', name: 'Saw', description: 'Circular saw 7 1/4"' },
            { id: '4', name: 'Wrench', description: 'Adjustable wrench 10"' },
            { id: '5', name: 'Tape', description: 'Measuring tape 25ft' },
        ];

        const newRows = demoData.map(d => ({ ...d, id: crypto.randomUUID() }));
        setRows(newRows);
    };

    return (
        <div style={{ padding: '1rem', borderTop: '1px solid #ddd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3>Data Source ({rows.length} rows)</h3>
                <div>
                    <button className="btn btn-secondary" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? 'Close Import' : 'Import Data'}
                    </button>
                    {rows.length > 0 && (
                        <button className="btn btn-danger" style={{ marginLeft: '8px' }} onClick={clearData}>
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {isOpen && (
                <div style={{ marginBottom: '1rem', background: '#f9f9f9', padding: '10px', borderRadius: '4px' }}>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
                        Paste CSV data below (Headers: Name, Description, ID)
                    </p>
                    <textarea
                        className="input"
                        style={{ width: '100%', height: '100px', fontFamily: 'monospace' }}
                        value={csvInput}
                        onChange={(e) => setCsvInput(e.target.value)}
                        placeholder="Name, Description, ID&#10;Hammer, Heavy Duty, 001&#10;Drill, Cordless, 002"
                    />
                    {csvError && (
                        <div style={{
                            padding: '8px',
                            marginBottom: '8px',
                            backgroundColor: '#ffe0e0',
                            color: '#ff0000',
                            borderRadius: '4px',
                            fontSize: '12px',
                            whiteSpace: 'pre-wrap',
                        }}>
                            {csvError}
                        </div>
                    )}
                    {csvWarnings.length > 0 && (
                        <div style={{
                            padding: '8px',
                            marginBottom: '8px',
                            backgroundColor: '#fff3cd',
                            color: '#856404',
                            borderRadius: '4px',
                            fontSize: '12px',
                            whiteSpace: 'pre-wrap',
                        }}>
                            <strong>Warnings:</strong>
                            <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                                {csvWarnings.map((warning, idx) => (
                                    <li key={idx} style={{ marginBottom: '2px' }}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="checkbox"
                            id="skipEmptyRows"
                            checked={skipEmptyRows}
                            onChange={(e) => setSkipEmptyRows(e.target.checked)}
                        />
                        <label htmlFor="skipEmptyRows" style={{ fontSize: '12px', cursor: 'pointer' }}>
                            Skip empty rows
                        </label>
                    </div>

                    {/* Column Mapping Preview */}
                    {showMappingPreview && columnMapping && (
                        <div style={{
                            padding: '10px',
                            marginBottom: '8px',
                            backgroundColor: '#fff3cd',
                            border: '1px solid #ffc107',
                            borderRadius: '4px',
                            fontSize: '12px',
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                                Column Mapping Preview
                            </div>
                            <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '8px' }}>
                                {Array.from(columnMapping.entries()).map(([csvHeader, columnId]) => {
                                    const col = columns.find(c => c.id === columnId);
                                    return (
                                        <div key={csvHeader} style={{ marginBottom: '4px', fontSize: '11px' }}>
                                            <strong>{csvHeader}</strong> → {col?.name || 'New Column'}
                                        </div>
                                    );
                                })}
                                {(() => {
                                    const parseResult = parseCSV(csvInput);
                                    return Array.from(columnMapping.keys()).length < parseResult.headers.length;
                                })() && (
                                    <div style={{ color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
                                        Some columns will be created automatically
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-primary" onClick={handleCreateColumnsForUnmapped}>
                                    Create Missing Columns & Import
                                </button>
                                <button className="btn btn-secondary" onClick={() => {
                                    setShowMappingPreview(false);
                                    setColumnMapping(null);
                                }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" onClick={handleParseCsv}>
                            Parse CSV
                        </button>
                        <button className="btn btn-secondary" onClick={handleImportDemo}>
                            Load Demo Data
                        </button>
                    </div>
                </div>
            )}

            {/* Column Manager */}
            <ColumnManager />

            {/* Mini Data Grid Preview */}
            {rows.length > 0 && (
                <div style={{ overflowX: 'auto', maxHeight: '150px' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.8rem',
                        textAlign: 'left'
                    }}>
                        <thead>
                            <tr style={{ background: '#eee' }}>
                                <th style={{ padding: '4px 8px', borderBottom: '2px solid #ddd', width: '20px' }}>
                                    <input
                                        type="checkbox"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                rows.forEach(row => {
                                                    if (!isRowSelected(row.id)) {
                                                        toggleRowSelection(row.id);
                                                    }
                                                });
                                            } else {
                                                rows.forEach(row => {
                                                    if (isRowSelected(row.id)) {
                                                        toggleRowSelection(row.id);
                                                    }
                                                });
                                            }
                                        }}
                                        checked={rows.length > 0 && rows.every(row => isRowSelected(row.id))}
                                    />
                                </th>
                                {columns.map(col => (
                                    <th key={col.id} style={{ padding: '4px 8px', borderBottom: '2px solid #ddd' }}>
                                        {col.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => {
                                const isSelected = isRowSelected(row.id);
                                return (
                                    <tr
                                        key={row.id}
                                        onClick={() => toggleRowSelection(row.id)}
                                        style={{
                                            borderBottom: '1px solid #eee',
                                            backgroundColor: isSelected ? '#e0f2ff' : 'transparent',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <td style={{ padding: '4px 8px', width: '20px' }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleRowSelection(row.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        {columns.map(col => (
                                            <td key={col.id} style={{ padding: '4px 8px' }}>
                                                {row[col.id] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
