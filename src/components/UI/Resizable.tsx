'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface ResizableProps {
    children: React.ReactNode;
    side: 'left' | 'right';
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    backgroundColor?: string;
}

export default function Resizable({
    children,
    side,
    defaultWidth = 300,
    minWidth = 200,
    maxWidth = 600,
    backgroundColor,
}: ResizableProps) {
    const [width, setWidth] = useState(defaultWidth);
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startXRef = useRef<number>(0);
    const startWidthRef = useRef<number>(defaultWidth);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        startXRef.current = e.clientX;
        startWidthRef.current = width;
    }, [width]);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const container = containerRef.current;
            if (!container) return;

            let newWidth: number;
            const deltaX = e.clientX - startXRef.current;

            if (side === 'left') {
                newWidth = startWidthRef.current + deltaX;
            } else {
                newWidth = startWidthRef.current - deltaX;
            }

            // Clamp width between min and max
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
            setWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, side, minWidth, maxWidth]);

    return (
        <div
            ref={containerRef}
            style={{
                width: `${width}px`,
                position: 'relative',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: backgroundColor || 'transparent',
            }}
        >
            {children}

            {/* Resize Handle */}
            <div
                onMouseDown={handleMouseDown}
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    [side === 'left' ? 'right' : 'left']: 0,
                    width: '8px',
                    cursor: 'ew-resize',
                    backgroundColor: isResizing ? 'var(--color-accent)' : 'transparent',
                    transition: isResizing ? 'none' : 'background-color 0.2s',
                    zIndex: 9999,
                }}
                onMouseEnter={(e) => {
                    if (!isResizing) {
                        e.currentTarget.style.backgroundColor = 'var(--color-border)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isResizing) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }
                }}
            />
        </div>
    );
}
