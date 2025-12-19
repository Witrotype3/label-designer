'use client';

import React from 'react';
import styles from '@/styles/ui.module.css';

interface ExportProgressDialogProps {
    isOpen: boolean;
    current: number;
    total: number;
    onCancel?: () => void;
}

export default function ExportProgressDialog({
    isOpen,
    current,
    total,
    onCancel,
}: ExportProgressDialogProps) {
    if (!isOpen) return null;

    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal} style={{ maxWidth: '400px' }}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>Exporting PDF</div>
                </div>
                <div className={styles.modalBody}>
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            marginBottom: '8px',
                            fontSize: '14px'
                        }}>
                            <span>Progress: {current} of {total}</span>
                            <span>{percentage}%</span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '24px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '4px',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                width: `${percentage}%`,
                                height: '100%',
                                backgroundColor: '#2563eb',
                                transition: 'width 0.3s ease',
                            }} />
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        Please wait while labels are being generated...
                    </div>
                </div>
                {onCancel && (
                    <div className={styles.modalFooter}>
                        <button className="btn btn-secondary" onClick={onCancel}>
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

