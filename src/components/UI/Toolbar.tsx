'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useDataStore } from '@/store/dataStore';
import { generateBulkPDF } from '@/lib/export';
import { saveDesignFile, loadDesignFile, saveDesignOnlyFile, loadDesignOnlyFile } from '@/lib/fileFormat';
import { checkMissingReferences, type MissingReferences } from '@/lib/referenceChecker';
import ConfirmDialog from './ConfirmDialog';
import ExportProgressDialog from './ExportProgressDialog';
import DropdownMenu, { type MenuItem } from './DropdownMenu';
import styles from '@/styles/ui.module.css';

export default function Toolbar() {
    const { 
        template, 
        masterLabel, 
        labelOverrides,
        selectedElementIds,
        setTemplate,
        setMasterLabel,
        setLabelOverride,
        clearAllOverrides,
        copyElements,
        pasteElements,
        duplicateElements,
        clipboard,
        viewMode, 
        setViewMode, 
        zoom, 
        setZoom, 
        previewPageIndex, 
        setPreviewPageIndex,
        undo, 
        redo
    } = useDesignStore();
    const { 
        rows, 
        columns,
        selectedRowIds, 
        setColumns,
        setRows,
        selectAllRows, 
        clearRowSelection 
    } = useDataStore();
    
    // Get canUndo/canRedo from temporal store - subscribe to changes
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    
    // File operations
    const fileInputRef = useRef<HTMLInputElement>(null);
    const designFileInputRef = useRef<HTMLInputElement>(null);
    const [showLoadConfirm, setShowLoadConfirm] = useState(false);
    const [showLoadDesignConfirm, setShowLoadDesignConfirm] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingDesignFile, setPendingDesignFile] = useState<File | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [exportProgress, setExportProgress] = useState<{ isOpen: boolean; current: number; total: number }>({
        isOpen: false,
        current: 0,
        total: 0,
    });
    
    
    useEffect(() => {
        const temporalStore = useDesignStore.temporal;
        
        // Initial state
        const updateFlags = () => {
            const state = temporalStore.getState();
            setCanUndo(state.pastStates.length > 0);
            setCanRedo(state.futureStates.length > 0);
        };
        
        updateFlags();
        
        // Subscribe to changes
        const unsubscribe = temporalStore.subscribe(updateFlags);
        
        return () => {
            unsubscribe();
        };
    }, []);


    // Preview navigation (page-based)
    const totalRows = rows.length;
    const labelsPerPage = template.rows * template.columns;
    const totalPages = Math.ceil(totalRows / labelsPerPage) || 1;
    const canGoPrevious = previewPageIndex > 0;
    const canGoNext = previewPageIndex < totalPages - 1;
    
    const handlePreviousPage = () => {
        if (canGoPrevious) {
            setPreviewPageIndex(previewPageIndex - 1);
        }
    };
    
    const handleNextPage = () => {
        if (canGoNext) {
            setPreviewPageIndex(previewPageIndex + 1);
        }
    };
    
    // Missing references tracking
    const [missingRefs, setMissingRefs] = useState<MissingReferences | null>(null);

    // Check for missing references when in PREVIEW mode
    useEffect(() => {
        if (viewMode === 'PREVIEW') {
            checkMissingReferences(template, masterLabel, labelOverrides, rows, columns)
                .then(setMissingRefs)
                .catch(err => {
                    console.error('Failed to check missing references:', err);
                    setMissingRefs(null);
                });
        } else {
            setMissingRefs(null);
        }
    }, [viewMode, template, masterLabel, labelOverrides, rows, columns]);


    const handleZoomIn = () => setZoom(zoom * 1.2);
    const handleZoomOut = () => setZoom(zoom / 1.2);
    const handleZoomReset = () => setZoom(1.0);

    const handleExport = async () => {
        const effectiveRows = selectedRowIds.size > 0 
            ? rows.filter(row => selectedRowIds.has(row.id))
            : rows;
        const totalLabels = effectiveRows.length || 1;

        setExportProgress({ isOpen: true, current: 0, total: totalLabels });

        try {
            await generateBulkPDF({
                template,
                masterLabel,
                rows,
                filename: 'bulk-labels.pdf',
                selectedRowIds: selectedRowIds.size > 0 ? selectedRowIds : undefined,
                onProgress: (current: number, total: number) => {
                    setExportProgress({ isOpen: true, current, total });
                },
            });
            setExportProgress({ isOpen: false, current: 0, total: 0 });
        } catch (error) {
            console.error('Export failed:', error);
            setExportProgress({ isOpen: false, current: 0, total: 0 });
            alert('Export failed. See console for details.');
        }
    };

    const handleExportSelection = async () => {
        if (selectedRowIds.size === 0) {
            alert('Please select at least one row to export.');
            return;
        }
        
        const effectiveRows = rows.filter(row => selectedRowIds.has(row.id));
        setExportProgress({ isOpen: true, current: 0, total: effectiveRows.length });

        try {
            await generateBulkPDF({
                template,
                masterLabel,
                rows,
                filename: 'selected-labels.pdf',
                selectedRowIds,
                onProgress: (current: number, total: number) => {
                    setExportProgress({ isOpen: true, current, total });
                },
            });
            setExportProgress({ isOpen: false, current: 0, total: 0 });
        } catch (error) {
            console.error('Export failed:', error);
            setExportProgress({ isOpen: false, current: 0, total: 0 });
            alert('Export failed. See console for details.');
        }
    };

    const handleSave = () => {
        try {
            setSaveError(null);
            saveDesignFile(
                {
                    template,
                    masterLabel,
                    labelOverrides,
                },
                {
                    columns,
                    rows,
                }
            );
            // Show success feedback (could use a toast notification in the future)
            console.log('Design saved successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save design';
            setSaveError(errorMessage);
            alert(`Error saving design: ${errorMessage}`);
        }
    };

    const handleLoadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if there are unsaved changes (simple check: has elements or data)
        const hasUnsavedChanges = masterLabel.elements.length > 0 || rows.length > 0 || labelOverrides.size > 0;

        if (hasUnsavedChanges) {
            setPendingFile(file);
            setShowLoadConfirm(true);
        } else {
            await performLoad(file);
        }

        // Reset file input
        e.target.value = '';
    };

    const performLoad = async (file: File) => {
        try {
            setLoadError(null);
            const { design, data, validationErrors, validationWarnings } = await loadDesignFile(file);

            // Show validation warnings if any (non-blocking)
            if (validationWarnings.length > 0) {
                console.warn('Data validation warnings:', validationWarnings);
                // Optionally show to user in a non-blocking way
                const warningsText = validationWarnings.join('\n');
                if (warningsText.length < 200) {
                    console.warn(`Warnings: ${warningsText}`);
                }
            }

            // Update design store
            setTemplate(design.template);
            setMasterLabel(design.masterLabel);
            clearAllOverrides();
            // Restore label overrides (design.labelOverrides is a Map)
            design.labelOverrides.forEach((override, labelIndex) => {
                setLabelOverride(labelIndex, override);
            });

            // Update data store
            setColumns(data.columns);
            setRows(data.rows);
            clearRowSelection();

            // Show success feedback
            console.log('Design loaded successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load design';
            setLoadError(errorMessage);
            alert(`Error loading design: ${errorMessage}`);
        }
    };

    const handleConfirmLoad = async () => {
        setShowLoadConfirm(false);
        if (pendingFile) {
            await performLoad(pendingFile);
            setPendingFile(null);
        }
    };

    const handleCancelLoad = () => {
        setShowLoadConfirm(false);
        setPendingFile(null);
    };

    const handleSaveDesignOnly = () => {
        try {
            setSaveError(null);
            saveDesignOnlyFile(
                {
                    template,
                    masterLabel,
                    labelOverrides,
                }
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save design';
            setSaveError(errorMessage);
            alert(`Error saving design: ${errorMessage}`);
        }
    };

    const handleLoadDesignClick = () => {
        designFileInputRef.current?.click();
    };

    const handleDesignFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if there are unsaved design changes
        const hasUnsavedChanges = masterLabel.elements.length > 0 || labelOverrides.size > 0;

        if (hasUnsavedChanges) {
            setPendingDesignFile(file);
            setShowLoadDesignConfirm(true);
        } else {
            await performLoadDesign(file);
        }

        // Reset file input
        e.target.value = '';
    };

    const performLoadDesign = async (file: File) => {
        try {
            setLoadError(null);
            const design = await loadDesignOnlyFile(file);

            // Update design store only (keep existing data/images)
            setTemplate(design.template);
            setMasterLabel(design.masterLabel);
            clearAllOverrides();
            // Restore label overrides
            design.labelOverrides.forEach((override, labelIndex) => {
                setLabelOverride(labelIndex, override);
            });

            // Show success feedback
            console.log('Design loaded successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load design';
            setLoadError(errorMessage);
            alert(`Error loading design: ${errorMessage}`);
        }
    };

    const handleConfirmLoadDesign = async () => {
        setShowLoadDesignConfirm(false);
        if (pendingDesignFile) {
            await performLoadDesign(pendingDesignFile);
            setPendingDesignFile(null);
        }
    };

    const handleCancelLoadDesign = () => {
        setShowLoadDesignConfirm(false);
        setPendingDesignFile(null);
    };

    return (
        <div 
            className={styles.toolbar}
        >
            {/* Left Section - Logo */}
            <div className={styles.toolbarSection}>
                <div className={styles.logo}>Label Designer</div>
            </div>

            {/* Middle Section - Dropdown Menus */}
            <div className={styles.toolbarSection} style={{ flex: '1 1 auto', minWidth: '400px', overflowX: 'auto', overflowY: 'visible', flexWrap: 'nowrap', gap: 'var(--spacing-xs)' }}>
                {/* File Menu */}
                <DropdownMenu
                    label="File"
                    items={[
                        {
                            label: 'Save All',
                            icon: '💾',
                            shortcut: 'Ctrl+S',
                            onClick: handleSave,
                        },
                        {
                            label: 'Load All',
                            icon: '📂',
                            shortcut: 'Ctrl+O',
                            onClick: handleLoadClick,
                        },
                        {
                            divider: true,
                            label: '',
                            onClick: () => {},
                        },
                        {
                            label: 'Save Design',
                            icon: '📄',
                            onClick: handleSaveDesignOnly,
                        },
                        {
                            label: 'Load Design',
                            icon: '📋',
                            onClick: handleLoadDesignClick,
                        },
                    ]}
                />

                {/* Edit Menu */}
                <DropdownMenu
                    label="Edit"
                    items={[
                        {
                            label: 'Undo',
                            icon: '↶',
                            shortcut: 'Ctrl+Z',
                            onClick: undo,
                            disabled: !canUndo,
                        },
                        {
                            label: 'Redo',
                            icon: '↷',
                            shortcut: 'Ctrl+Y',
                            onClick: redo,
                            disabled: !canRedo,
                        },
                        {
                            divider: true,
                            label: '',
                            onClick: () => {},
                        },
                        {
                            label: 'Copy',
                            icon: '📋',
                            shortcut: 'Ctrl+C',
                            onClick: () => copyElements(selectedElementIds),
                            disabled: selectedElementIds.length === 0,
                        },
                        {
                            label: 'Paste',
                            icon: '📄',
                            shortcut: 'Ctrl+V',
                            onClick: pasteElements,
                            disabled: clipboard.length === 0,
                        },
                        {
                            label: 'Duplicate',
                            icon: '📑',
                            shortcut: 'Ctrl+D',
                            onClick: () => duplicateElements(selectedElementIds),
                            disabled: selectedElementIds.length === 0,
                        },
                    ]}
                />

                {/* View Menu */}
                <DropdownMenu
                    label="View"
                    items={[
                        {
                            label: viewMode === 'TEMPLATE' ? '✓ Template' : 'Template',
                            onClick: () => setViewMode('TEMPLATE'),
                        },
                        {
                            label: viewMode === 'PREVIEW' ? '✓ Preview' : 'Preview',
                            onClick: () => setViewMode('PREVIEW'),
                        },
                        ...(viewMode === 'PREVIEW' && totalRows > 0 ? [
                            {
                                divider: true,
                                label: '',
                                onClick: () => {},
                            },
                            {
                                label: 'Previous Page',
                                icon: '◀',
                                onClick: handlePreviousPage,
                                disabled: !canGoPrevious,
                            },
                            {
                                label: 'Next Page',
                                icon: '▶',
                                onClick: handleNextPage,
                                disabled: !canGoNext,
                            },
                            {
                                label: `Go To Page... (${previewPageIndex + 1} of ${totalPages})`,
                                onClick: () => {
                                    const pageNum = prompt(`Go to page (1-${totalPages}):`, (previewPageIndex + 1).toString());
                                    if (pageNum !== null) {
                                        const index = parseInt(pageNum) - 1;
                                        if (!isNaN(index) && index >= 0 && index < totalPages) {
                                            setPreviewPageIndex(index);
                                        }
                                    }
                                },
                            },
                        ] : []),
                    ]}
                />

                {/* Export Menu */}
                <DropdownMenu
                    label="Export"
                    items={[
                        {
                            label: 'Export PDF',
                            icon: '📄',
                            onClick: handleExport,
                        },
                        ...(selectedRowIds.size > 0 ? [
                            {
                                label: `Export Selection (${selectedRowIds.size})`,
                                icon: '📋',
                                onClick: handleExportSelection,
                            },
                        ] : []),
                    ]}
                />

                {/* Missing References Indicator */}
                {viewMode === 'PREVIEW' && missingRefs && missingRefs.totalCount > 0 && (
                    <DropdownMenu
                        label={`⚠️ ${missingRefs.totalCount} missing`}
                        buttonStyle={{
                            backgroundColor: missingRefs.totalCount > 10 ? '#fee2e2' : '#fef3c7',
                            color: missingRefs.totalCount > 10 ? '#991b1b' : '#92400e',
                            border: `1px solid ${missingRefs.totalCount > 10 ? '#fecaca' : '#fde68a'}`,
                            fontWeight: 'bold',
                        }}
                        items={[
                            {
                                label: 'Missing References',
                                disabled: true,
                                onClick: () => {},
                            },
                            ...(missingRefs.missingImages.length > 0 ? [
                                {
                                    divider: true,
                                    label: '',
                                    onClick: () => {},
                                },
                                {
                                    label: `Missing Images (${missingRefs.missingImages.length})`,
                                    disabled: true,
                                    onClick: () => {},
                                },
                                ...Array.from(new Set(missingRefs.missingImages.map(m => m.imageName))).slice(0, 20).map((name) => ({
                                    label: `  • ${name}`,
                                    disabled: true,
                                    onClick: () => {},
                                })),
                                ...(Array.from(new Set(missingRefs.missingImages.map(m => m.imageName))).length > 20 ? [{
                                    label: `  ... and ${Array.from(new Set(missingRefs.missingImages.map(m => m.imageName))).length - 20} more`,
                                    disabled: true,
                                    onClick: () => {},
                                }] : []),
                            ] : []),
                            ...(missingRefs.missingColumns.length > 0 ? [
                                {
                                    divider: true,
                                    label: '',
                                    onClick: () => {},
                                },
                                {
                                    label: `Missing Columns (${missingRefs.missingColumns.length})`,
                                    disabled: true,
                                    onClick: () => {},
                                },
                                ...Array.from(new Set(missingRefs.missingColumns.map(m => m.columnName))).slice(0, 20).map((name) => ({
                                    label: `  • ${name}`,
                                    disabled: true,
                                    onClick: () => {},
                                })),
                                ...(Array.from(new Set(missingRefs.missingColumns.map(m => m.columnName))).length > 20 ? [{
                                    label: `  ... and ${Array.from(new Set(missingRefs.missingColumns.map(m => m.columnName))).length - 20} more`,
                                    disabled: true,
                                    onClick: () => {},
                                }] : []),
                            ] : []),
                            ...(missingRefs.missingData.length > 0 ? [
                                {
                                    divider: true,
                                    label: '',
                                    onClick: () => {},
                                },
                                {
                                    label: `Missing Data (${missingRefs.missingData.length})`,
                                    disabled: true,
                                    onClick: () => {},
                                },
                                ...missingRefs.missingData.slice(0, 20).map((m) => ({
                                    label: `  • Row ${m.rowIndex + 1}, "${m.columnName}"`,
                                    disabled: true,
                                    onClick: () => {},
                                })),
                                ...(missingRefs.missingData.length > 20 ? [{
                                    label: `  ... and ${missingRefs.missingData.length - 20} more`,
                                    disabled: true,
                                    onClick: () => {},
                                }] : []),
                            ] : []),
                        ]}
                    />
                )}

                {/* Zoom Menu */}
                <DropdownMenu
                    label="Zoom"
                    items={[
                        {
                            label: 'Zoom In',
                            icon: '+',
                            shortcut: 'Ctrl++',
                            onClick: handleZoomIn,
                        },
                        {
                            label: 'Zoom Out',
                            icon: '−',
                            shortcut: 'Ctrl+-',
                            onClick: handleZoomOut,
                        },
                        {
                            label: 'Reset Zoom',
                            onClick: handleZoomReset,
                        },
                        {
                            divider: true,
                            label: '',
                            onClick: () => {},
                        },
                        {
                            label: `Current: ${Math.round(zoom * 100)}%`,
                            onClick: () => {},
                            disabled: true,
                        },
                    ]}
                />
            </div>

            {/* Hidden file inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".labeldesign,.json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />
            <input
                ref={designFileInputRef}
                type="file"
                accept=".labeltemplate,.labeldesign,.json"
                style={{ display: 'none' }}
                onChange={handleDesignFileChange}
            />

            {/* Confirmation Dialog */}
            {showLoadConfirm && (
                <ConfirmDialog
                    title="Unsaved Changes"
                    message="You have unsaved changes. Loading a new file will replace your current design. Are you sure you want to continue?"
                    onConfirm={handleConfirmLoad}
                    onCancel={handleCancelLoad}
                />
            )}

            {/* Export Progress Dialog */}
            <ExportProgressDialog
                isOpen={exportProgress.isOpen}
                current={exportProgress.current}
                total={exportProgress.total}
                onCancel={() => setExportProgress({ isOpen: false, current: 0, total: 0 })}
            />

        </div>
    );
}
