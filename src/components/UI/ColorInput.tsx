'use client';

import React from 'react';
import styles from '@/styles/ui.module.css';

interface ColorInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

export default function ColorInput({ label, value, onChange }: ColorInputProps) {
    const isTransparent = value === 'transparent' || !value;

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const toggleTransparent = () => {
        if (isTransparent) {
            onChange('#000000');
        } else {
            onChange('transparent');
        }
    };

    return (
        <div className={styles.propertyRow}>
            <label className={styles.propertyLabel}>{label}</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                {!isTransparent ? (
                    <div style={{ position: 'relative', flex: 1, height: '32px' }}>
                        <input
                            type="color"
                            value={value}
                            onChange={handleColorChange}
                            className={styles.propertyInput}
                            style={{
                                height: '100%',
                                width: '100%',
                                padding: '2px',
                                cursor: 'pointer',
                                minWidth: 0
                            }}
                        />
                    </div>
                ) : (
                    <div
                        className={styles.propertyInput}
                        style={{
                            height: '32px',
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `
                                linear-gradient(45deg, #eee 25%, transparent 25%), 
                                linear-gradient(-45deg, #eee 25%, transparent 25%), 
                                linear-gradient(45deg, transparent 75%, #eee 75%), 
                                linear-gradient(-45deg, transparent 75%, #eee 75%)`,
                            backgroundSize: '10px 10px',
                            backgroundColor: '#fff',
                            color: '#999',
                            fontSize: '11px',
                            userSelect: 'none',
                            border: '1px solid var(--color-border)'
                        }}
                    >
                        None
                    </div>
                )}

                <button
                    className="btn btn-ghost"
                    onClick={toggleTransparent}
                    title={isTransparent ? "Set Color" : "No Color"}
                    style={{
                        width: '32px',
                        height: '32px',
                        padding: 0,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'white',
                        borderRadius: 'var(--radius-sm)'
                    }}
                >
                    {isTransparent ? '➕' : '🚫'}
                </button>
            </div>
        </div>
    );
}
