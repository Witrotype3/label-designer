'use client';

import React, { useState } from 'react';
import { useDesignStore } from '@/store/designStore';
import { PREDEFINED_TEMPLATES } from '@/lib/templates';
import type { LabelTemplate } from '@/types';
import styles from '@/styles/ui.module.css';

export default function TemplateSelector() {
    const [isOpen, setIsOpen] = useState(false);
    const { template, setTemplate } = useDesignStore();

    const handleSelectTemplate = (newTemplate: LabelTemplate) => {
        setTemplate(newTemplate);
        setIsOpen(false);
    };

    return (
        <>
            {/* Template Button */}
            <div className={styles.sidebarSection}>
                <div className={styles.sidebarTitle}>Template</div>
                <button
                    className="btn btn-secondary"
                    onClick={() => setIsOpen(true)}
                    style={{ width: '100%', marginBottom: '8px' }}
                >
                    📋 Change Template
                </button>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    <div style={{ marginBottom: '8px' }}>
                        <strong>{template.name}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                        {template.description}
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '11px', fontFamily: 'monospace' }}>
                        {template.rows} × {template.columns} labels<br />
                        {template.labelWidth.toFixed(1)} × {template.labelHeight.toFixed(1)} mm
                    </div>
                </div>
            </div>

            {/* Template Selector Modal */}
            {isOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Select Label Template</h2>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.templateGrid}>
                                {PREDEFINED_TEMPLATES.map((t) => (
                                    <div
                                        key={t.id}
                                        className={`${styles.templateCard} ${t.id === template.id ? styles.selected : ''
                                            }`}
                                        onClick={() => handleSelectTemplate(t)}
                                    >
                                        <div className={styles.templateName}>{t.name}</div>
                                        <div className={styles.templateDescription}>
                                            {t.description}
                                        </div>
                                        <div className={styles.templateSpecs}>
                                            {t.rows} × {t.columns} = {t.rows * t.columns} labels<br />
                                            {t.labelWidth.toFixed(1)} × {t.labelHeight.toFixed(1)} mm
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setIsOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
