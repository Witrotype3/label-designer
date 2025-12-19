'use client';

import React, { useEffect, useRef } from 'react';
import styles from '@/styles/ui.module.css';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        // Focus the confirm button when dialog opens
        confirmButtonRef.current?.focus();

        // Handle Escape key
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onCancel]);

    // Prevent clicks on overlay from closing dialog
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={handleOverlayClick}>
            <div className={styles.modal} ref={dialogRef} style={{ maxWidth: '400px' }}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>{title}</div>
                </div>
                <div className={styles.modalBody}>
                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{message}</p>
                </div>
                <div className={styles.modalFooter}>
                    <button
                        className="btn btn-secondary"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        className="btn btn-primary"
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

