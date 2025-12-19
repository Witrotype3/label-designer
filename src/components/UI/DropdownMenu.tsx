'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from '@/styles/ui.module.css';

export interface MenuItem {
    label: string;
    icon?: string;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
    divider?: boolean; // Show divider after this item
}

interface DropdownMenuProps {
    label: string;
    items: MenuItem[];
    disabled?: boolean;
    buttonStyle?: React.CSSProperties;
    buttonClassName?: string;
}

export default function DropdownMenu({ label, items, disabled = false, buttonStyle, buttonClassName }: DropdownMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

    // Close menu when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
                panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setFocusedIndex(-1);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setFocusedIndex(-1);
                buttonRef.current?.focus();
            }
        };

        // Use click instead of mousedown to avoid immediate closing
        // Add a small delay to ensure the menu is fully rendered
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 10);

        document.addEventListener('keydown', handleEscape);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleToggle = () => {
        if (!disabled) {
            const newIsOpen = !isOpen;
            setIsOpen(newIsOpen);
            if (newIsOpen && buttonRef.current) {
                // Calculate position when opening
                const rect = buttonRef.current.getBoundingClientRect();
                setPanelPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                });
            } else {
                setFocusedIndex(-1);
            }
        }
    };

    const handleItemClick = (item: MenuItem) => {
        if (!item.disabled && !item.divider) {
            item.onClick();
            setIsOpen(false);
            setFocusedIndex(-1);
        }
    };

    const enabledItems = items.filter((item) => !item.disabled && !item.divider);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setFocusedIndex(prev => {
                        const nextIndex = prev < enabledItems.length - 1 ? prev + 1 : 0;
                        return nextIndex;
                    });
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setFocusedIndex(prev => {
                        const nextIndex = prev > 0 ? prev - 1 : enabledItems.length - 1;
                        return nextIndex;
                    });
                    break;
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    if (focusedIndex >= 0 && focusedIndex < enabledItems.length) {
                        const item = enabledItems[focusedIndex];
                        if (!item.disabled) {
                            item.onClick();
                            setIsOpen(false);
                            setFocusedIndex(-1);
                        }
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, focusedIndex, enabledItems]);

    return (
        <div className={styles.dropdownMenu} ref={menuRef}>
            <button
                ref={buttonRef}
                className={`${styles.dropdownMenuButton} ${buttonClassName || ''}`}
                style={buttonStyle}
                onClick={handleToggle}
                disabled={disabled}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                {label}
                <span className={styles.dropdownMenuArrow}>{isOpen ? '▲' : '▼'}</span>
            </button>
            
            {isOpen && (
                <div 
                    ref={panelRef}
                    className={styles.dropdownMenuPanel} 
                    role="menu"
                    style={{
                        top: `${panelPosition.top}px`,
                        left: `${panelPosition.left}px`,
                    }}
                >
                    {items.map((item, index) => {
                        if (item.divider) {
                            return <div key={`divider-${index}`} className={styles.dropdownMenuDivider} />;
                        }
                        
                        const itemIndex = enabledItems.indexOf(item);
                        const isFocused = itemIndex === focusedIndex;
                        
                        return (
                            <button
                                key={index}
                                className={`${styles.dropdownMenuItem} ${item.disabled ? styles.dropdownMenuItemDisabled : ''} ${isFocused ? styles.dropdownMenuItemFocused : ''}`}
                                onClick={() => handleItemClick(item)}
                                disabled={item.disabled}
                                role="menuitem"
                                onMouseEnter={() => {
                                    if (itemIndex >= 0) {
                                        setFocusedIndex(itemIndex);
                                    }
                                }}
                            >
                                {item.icon && <span className={styles.dropdownMenuIcon}>{item.icon}</span>}
                                <span className={styles.dropdownMenuItemLabel}>{item.label}</span>
                                {item.shortcut && (
                                    <span className={styles.dropdownMenuShortcut}>{item.shortcut}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

