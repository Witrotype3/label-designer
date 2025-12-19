'use client';

import { useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';

/**
 * Keyboard shortcuts hook
 * Handles Delete, Arrow keys (nudge), Ctrl+Z (undo), Ctrl+Y (redo), Escape (clear selection)
 */
export function useKeyboardShortcuts() {
    const {
        selectedElementIds,
        removeMasterElement,
        updateMasterElement,
        masterLabel,
        clearSelection,
        undo,
        redo,
        copyElements,
        pasteElements,
        duplicateElements,
        clipboard,
    } = useDesignStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle shortcuts when typing in inputs/textarea
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                // Allow Escape to clear selection even when typing
                if (e.key === 'Escape') {
                    clearSelection();
                }
                return;
            }

            // Delete/Backspace: Remove selected elements
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementIds.length > 0) {
                e.preventDefault();
                // Remove all selected elements (in reverse order to avoid index issues)
                [...selectedElementIds].reverse().forEach((id) => {
                    removeMasterElement(id);
                });
                return;
            }

            // Arrow keys: Nudge selected element
            if (selectedElementIds.length === 1 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const elementId = selectedElementIds[0];
                const element = masterLabel.elements.find((el) => el.id === elementId);
                if (!element) return;

                const nudgeAmount = e.shiftKey ? 5 : 1; // Shift = 5mm, normal = 1mm
                let dx = 0;
                let dy = 0;

                switch (e.key) {
                    case 'ArrowUp':
                        dy = -nudgeAmount;
                        break;
                    case 'ArrowDown':
                        dy = nudgeAmount;
                        break;
                    case 'ArrowLeft':
                        dx = -nudgeAmount;
                        break;
                    case 'ArrowRight':
                        dx = nudgeAmount;
                        break;
                }

                if (dx !== 0 || dy !== 0) {
                    updateMasterElement(elementId, {
                        transform: {
                            ...element.transform,
                            x: element.transform.x + dx,
                            y: element.transform.y + dy,
                        },
                    });
                }
                return;
            }

            // Ctrl/Cmd + Z: Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }

            // Ctrl/Cmd + Y or Shift+Ctrl/Cmd+Z: Redo
            if (
                ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
            ) {
                e.preventDefault();
                redo();
                return;
            }

            // Ctrl/Cmd + C: Copy
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedElementIds.length > 0) {
                e.preventDefault();
                copyElements(selectedElementIds);
                return;
            }

            // Ctrl/Cmd + V: Paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard.length > 0) {
                e.preventDefault();
                pasteElements();
                return;
            }

            // Ctrl/Cmd + D: Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedElementIds.length > 0) {
                e.preventDefault();
                duplicateElements(selectedElementIds);
                return;
            }

            // Escape: Clear selection
            if (e.key === 'Escape' && selectedElementIds.length > 0) {
                e.preventDefault();
                clearSelection();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedElementIds, masterLabel, removeMasterElement, updateMasterElement, clearSelection, undo, redo, copyElements, pasteElements, duplicateElements, clipboard]);
}

