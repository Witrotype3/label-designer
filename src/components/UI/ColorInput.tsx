'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/styles/ui.module.css';

interface ColorInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

// Validate and normalize hex color
function normalizeHex(hex: string): string | null {
    if (!hex) return null;
    
    // Remove whitespace
    hex = hex.trim();
    
    // Add # if missing
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }
    
    // Convert to uppercase
    hex = hex.toUpperCase();
    
    // Validate format: #RGB or #RRGGBB
    const hexRegex = /^#([0-9A-F]{3}|[0-9A-F]{6})$/;
    if (!hexRegex.test(hex)) {
        return null;
    }
    
    // Convert short hex (#RGB) to full format (#RRGGBB)
    if (hex.length === 4) {
        const r = hex[1];
        const g = hex[2];
        const b = hex[3];
        hex = `#${r}${r}${g}${g}${b}${b}`;
    }
    
    return hex;
}

export default function ColorInput({ label, value, onChange }: ColorInputProps) {
    const isTransparent = value === 'transparent' || !value;
    const [hexInput, setHexInput] = useState(value === 'transparent' ? '' : value);
    const [isValidHex, setIsValidHex] = useState(true);

    // Update hex input when value changes externally
    useEffect(() => {
        if (value !== 'transparent' && value) {
            setHexInput(value);
            setIsValidHex(true);
        } else if (value === 'transparent') {
            setHexInput('');
            setIsValidHex(true);
        }
    }, [value]);

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        setHexInput(input);
        
        // Allow empty input while typing
        if (input === '') {
            setIsValidHex(true);
            return;
        }
        
        const normalized = normalizeHex(input);
        if (normalized) {
            setIsValidHex(true);
            onChange(normalized);
        } else {
            setIsValidHex(false);
        }
    };

    const handleHexInputBlur = () => {
        // On blur, try to normalize the input
        if (hexInput.trim() === '') {
            setIsValidHex(true);
            return;
        }
        
        const normalized = normalizeHex(hexInput);
        if (normalized) {
            setHexInput(normalized);
            setIsValidHex(true);
            onChange(normalized);
        } else {
            // Reset to current value if invalid
            setHexInput(value === 'transparent' ? '' : value);
            setIsValidHex(true);
        }
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
                    <>
                        <div style={{ position: 'relative', height: '32px', width: '60px', flexShrink: 0 }}>
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
                        <input
                            type="text"
                            value={hexInput}
                            onChange={handleHexInputChange}
                            onBlur={handleHexInputBlur}
                            placeholder="#000000"
                            className={styles.propertyInput}
                            style={{
                                height: '32px',
                                flex: 1,
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                borderColor: isValidHex ? 'var(--color-border)' : '#ef4444',
                                boxShadow: isValidHex ? 'none' : '0 0 0 1px #ef4444'
                            }}
                        />
                    </>
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
