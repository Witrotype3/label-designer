import { create } from 'zustand';

export type ColumnType = 'text' | 'image' | 'qr' | 'barcode' | 'number';

export interface DataColumn {
    id: string;
    name: string;
    type: ColumnType;
    required: boolean;
}

export type DataValue = string | number | null;

export interface DataRow {
    id: string;
    [columnId: string]: DataValue | undefined;
}

interface DataState {
    columns: DataColumn[];
    rows: DataRow[];
    selectedRowIds: Set<string>; // Track which rows are selected for printing

    // Actions
    setColumns: (columns: DataColumn[]) => void;
    setRows: (rows: DataRow[]) => void;
    addRow: (row: DataRow) => void;
    updateRow: (id: string, data: Partial<DataRow>) => void;
    removeRow: (id: string) => void;
    addColumn: (column: DataColumn) => void;
    updateColumn: (columnId: string, updates: Partial<DataColumn>) => void;
    renameColumn: (columnId: string, newName: string) => void;
    removeColumn: (columnId: string) => void;
    clearData: () => void;
    
    // Selection actions
    toggleRowSelection: (rowId: string) => void;
    selectAllRows: () => void;
    clearRowSelection: () => void;
    isRowSelected: (rowId: string) => boolean;
}

export const useDataStore = create<DataState>((set, get) => ({
    columns: [
        { id: 'id', name: 'ID', type: 'text', required: true },
        { id: 'name', name: 'Name', type: 'text', required: true },
        { id: 'description', name: 'Description', type: 'text', required: false },
    ],
    rows: [],
    selectedRowIds: new Set<string>(),

    setColumns: (columns) => set({ columns }),
    setRows: (rows) => set({ rows, selectedRowIds: new Set<string>() }), // Clear selection when rows change

    addRow: (row) => set((state) => ({
        rows: [...state.rows, row]
    })),

    updateRow: (id, data) => set((state) => ({
        rows: state.rows.map(row =>
            row.id === id ? { ...row, ...data } : row
        )
    })),

    removeRow: (id) => set((state) => {
        const newSelectedIds = new Set(state.selectedRowIds);
        newSelectedIds.delete(id);
        return {
            rows: state.rows.filter(row => row.id !== id),
            selectedRowIds: newSelectedIds
        };
    }),

    addColumn: (column) => set((state) => {
        // Check for duplicate names
        const nameExists = state.columns.some(c => c.name.toLowerCase() === column.name.toLowerCase() && c.id !== column.id);
        if (nameExists) {
            throw new Error(`Column with name "${column.name}" already exists`);
        }
        return { columns: [...state.columns, column] };
    }),

    updateColumn: (columnId, updates) => set((state) => {
        const columnIndex = state.columns.findIndex(c => c.id === columnId);
        if (columnIndex === -1) {
            throw new Error(`Column with id "${columnId}" not found`);
        }

        const updatedColumn = { ...state.columns[columnIndex], ...updates };
        
        // Check for duplicate names if name is being changed
        if (updates.name) {
            const nameExists = state.columns.some(c => 
                c.name.toLowerCase() === updates.name!.toLowerCase() && c.id !== columnId
            );
            if (nameExists) {
                throw new Error(`Column with name "${updates.name}" already exists`);
            }
        }

        const newColumns = [...state.columns];
        newColumns[columnIndex] = updatedColumn;

        // If column name changed, update all row data keys
        let newRows = state.rows;
        if (updates.name && state.columns[columnIndex].name !== updates.name) {
            const oldColumnName = state.columns[columnIndex].name;
            newRows = state.rows.map(row => {
                const newRow = { ...row };
                if (oldColumnName in newRow) {
                    newRow[columnId] = newRow[oldColumnName];
                    delete newRow[oldColumnName];
                }
                return newRow;
            });
        }

        return { columns: newColumns, rows: newRows };
    }),

    renameColumn: (columnId, newName) => {
        const state = get();
        state.updateColumn(columnId, { name: newName });
    },

    removeColumn: (id) => set((state) => {
        // Check if column has data
        const hasData = state.rows.some(row => row[id] !== undefined && row[id] !== null);
        
        // Remove column and clean up row data
        const newColumns = state.columns.filter(col => col.id !== id);
        const newRows = state.rows.map(row => {
            const newRow = { ...row };
            delete newRow[id];
            return newRow;
        });

        return { 
            columns: newColumns,
            rows: newRows
        };
    }),

    clearData: () => set({ rows: [], selectedRowIds: new Set<string>() }),

    toggleRowSelection: (rowId) => set((state) => {
        const newSelectedIds = new Set(state.selectedRowIds);
        if (newSelectedIds.has(rowId)) {
            newSelectedIds.delete(rowId);
        } else {
            newSelectedIds.add(rowId);
        }
        return { selectedRowIds: newSelectedIds };
    }),

    selectAllRows: () => set((state) => ({
        selectedRowIds: new Set(state.rows.map(row => row.id))
    })),

    clearRowSelection: () => set({ selectedRowIds: new Set<string>() }),

    isRowSelected: (rowId) => {
        const state = get();
        return state.selectedRowIds.has(rowId);
    },
}));
