'use client';

import React, { useCallback, useState, useEffect } from 'react';
import styles from '@/styles/canvas.module.css';
import { DesignElement } from '@/types';
import { mmToPx } from '@/lib/dimensions';

interface TransformControlsProps {
    element: DesignElement;
    zoom: number;
    panX: number;
    panY: number;
    dpi: number;
    containerOffset: { x: number, y: number }; // Label position in mm
    onUpdate: (updates: Partial<DesignElement>) => void;
}

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

export default function TransformControls({
    element,
    zoom,
    panX,
    panY,
    dpi,
    containerOffset,
    onUpdate
}: TransformControlsProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<HandleType | null>(null);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [startTransform, setStartTransform] = useState(element.transform);

    // Calculate screen position
    // (LabelPos + ElementPos) * Scale
    const x = mmToPx(containerOffset.x + element.transform.x, dpi) * zoom + panX;
    const y = mmToPx(containerOffset.y + element.transform.y, dpi) * zoom + panY;
    const width = mmToPx(element.transform.width, dpi) * zoom;
    const height = mmToPx(element.transform.height, dpi) * zoom;
    const rotation = element.transform.rotation;

    const handleMouseDown = (e: React.MouseEvent, type: HandleType) => {
        e.stopPropagation(); // Prevent canvas panning
        setIsDragging(true);
        setDragType(type);
        setStartPos({ x: e.clientX, y: e.clientY });
        setStartTransform({ ...element.transform });
    };

    useEffect(() => {
        if (!isDragging || !dragType) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = (e.clientX - startPos.x) / zoom;
            const deltaY = (e.clientY - startPos.y) / zoom;

            // Convert pixels to mm for updates
            // We need to reverse mmToPx: px / dpi * 96 * 25.4 (wait, mmToPx is val * dpi / 96 * 25.4? No.)
            // mmToPx = (mm * dpi) / 25.4
            // So pxToMm = (px * 25.4) / dpi
            const pxToMm = (px: number) => (px * 25.4) / dpi;

            // Calculate screen delta in mm
            const dxMmScreen = pxToMm(deltaX);
            const dyMmScreen = pxToMm(deltaY);

            // Convert to Local Delta (project onto element's axis)
            // This ensures that dragging the 'right' handle moves with the element's rotation
            const angleRad = (rotation * Math.PI) / 180;
            const cos = Math.cos(angleRad);
            const sin = Math.sin(angleRad);

            // Standard 2D rotation matrix to un-rotate the vector
            const dxMm = dxMmScreen * cos + dyMmScreen * sin;
            const dyMm = -dxMmScreen * sin + dyMmScreen * cos;

            const newTransform = { ...startTransform };

            if (dragType === 'rotate') {
                // Calculate angle relative to center
                const centerValX = x + width / 2;
                const centerValY = y + height / 2;
                const startCenterAngle = Math.atan2(startPos.y - centerValX, startPos.x - centerValX); // This was using mixed coords?
                // Re-calculate math for rotation
                // Center in screen pixels
                const centerX = x + width / 2;
                const centerY = y + height / 2;

                const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                const startAngle = Math.atan2(startPos.y - centerY, startPos.x - centerX);

                let angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
                let newRotation = (startTransform.rotation + angleDiff) % 360;

                // Snap to 15 degrees when Shift is held
                if (e.shiftKey) {
                    newRotation = Math.round(newRotation / 15) * 15;
                }
                
                // Keep rotation in 0-360 range
                if (newRotation < 0) newRotation += 360;
                if (newRotation >= 360) newRotation -= 360;

                newTransform.rotation = Math.round(newRotation);
            } else {
                // Resize Logic using Local Deltas (dxMm, dyMm)
                // Note: This simple logic assumes top-left origin for position, 
                // but visual rotation is usually center-based. 
                // For a truly robust implementation we'd adjust x/y to compensate for corner movement.
                // For now, let's keep it simple: width/height changes. 
                // X/Y changes (for left/top handles) need to be rotated back to world space.

                let dW = 0;
                let dH = 0;
                let dXLocal = 0;
                let dYLocal = 0;

                switch (dragType) {
                    case 'e': dW = dxMm; break;
                    case 'w': dW = -dxMm; dXLocal = dxMm; break;
                    case 's': dH = dyMm; break;
                    case 'n': dH = -dyMm; dYLocal = dyMm; break;
                    case 'se': dW = dxMm; dH = dyMm; break;
                    case 'sw': dW = -dxMm; dH = dyMm; dXLocal = dxMm; break;
                    case 'ne': dW = dxMm; dH = -dyMm; dYLocal = dyMm; break;
                    case 'nw': dW = -dxMm; dH = -dyMm; dXLocal = dxMm; dYLocal = dyMm; break;
                }

                // Maintain aspect ratio when Shift is held
                if (e.shiftKey && (dragType.includes('nw') || dragType.includes('ne') || dragType.includes('sw') || dragType.includes('se'))) {
                    const aspectRatio = startTransform.width / startTransform.height;
                    const newWidth = Math.max(5, startTransform.width + dW);
                    const newHeight = Math.max(5, startTransform.height + dH);
                    
                    // Use the larger dimension change to maintain aspect ratio
                    if (Math.abs(dW) > Math.abs(dH)) {
                        newTransform.width = newWidth;
                        newTransform.height = newWidth / aspectRatio;
                    } else {
                        newTransform.height = newHeight;
                        newTransform.width = newHeight * aspectRatio;
                    }
                    
                    // Recalculate dXLocal and dYLocal for corner handles
                    const widthDelta = newTransform.width - startTransform.width;
                    const heightDelta = newTransform.height - startTransform.height;
                    
                    if (dragType === 'nw') {
                        dXLocal = -widthDelta;
                        dYLocal = -heightDelta;
                    } else if (dragType === 'ne') {
                        dXLocal = 0;
                        dYLocal = -heightDelta;
                    } else if (dragType === 'sw') {
                        dXLocal = -widthDelta;
                        dYLocal = 0;
                    } else if (dragType === 'se') {
                        dXLocal = 0;
                        dYLocal = 0;
                    }
                } else {
                    newTransform.width = Math.max(5, startTransform.width + dW);
                    newTransform.height = Math.max(5, startTransform.height + dH);
                }

                // If we moved the left/top edge locally, we must move the definition point (x,y)
                // Rotate the local shift (dXLocal, dYLocal) back to World Space
                const dXWorld = dXLocal * cos - dYLocal * sin;
                const dYWorld = dXLocal * sin + dYLocal * cos;

                newTransform.x = startTransform.x + dXWorld;
                newTransform.y = startTransform.y + dYWorld;
            }

            onUpdate({ transform: newTransform });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setDragType(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragType, startPos, startTransform, zoom, dpi, onUpdate, x, y, width, height]);

    return (
        <div
            className={styles.transformControls}
            style={{
                left: x,
                top: y,
                width: width,
                height: height,
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                pointerEvents: 'none' // Allow clicks to pass through to canvas for moving
            }}
        >
            {/* Selection border */}
            <div style={{
                position: 'absolute',
                top: -2, left: -2, right: -2, bottom: -2,
                border: '2px solid var(--color-selection)',
                pointerEvents: 'none'
            }} />

            {/* Resize Handles */}
            <div className={`${styles.resizeHandle} ${styles.nw}`} onMouseDown={(e) => handleMouseDown(e, 'nw')} style={{ pointerEvents: 'auto' }} />
            <div className={`${styles.resizeHandle} ${styles.n}`} onMouseDown={(e) => handleMouseDown(e, 'n')} style={{ pointerEvents: 'auto' }} />
            <div className={`${styles.resizeHandle} ${styles.ne}`} onMouseDown={(e) => handleMouseDown(e, 'ne')} style={{ pointerEvents: 'auto' }} />
            <div className={`${styles.resizeHandle} ${styles.e}`} onMouseDown={(e) => handleMouseDown(e, 'e')} style={{ pointerEvents: 'auto' }} />
            <div className={`${styles.resizeHandle} ${styles.se}`} onMouseDown={(e) => handleMouseDown(e, 'se')} style={{ pointerEvents: 'auto' }} />
            <div className={`${styles.resizeHandle} ${styles.s}`} onMouseDown={(e) => handleMouseDown(e, 's')} style={{ pointerEvents: 'auto' }} />
            <div className={`${styles.resizeHandle} ${styles.sw}`} onMouseDown={(e) => handleMouseDown(e, 'sw')} style={{ pointerEvents: 'auto' }} />
            <div className={`${styles.resizeHandle} ${styles.w}`} onMouseDown={(e) => handleMouseDown(e, 'w')} style={{ pointerEvents: 'auto' }} />

            {/* Rotate Handle */}
            <div className={styles.rotateHandle} onMouseDown={(e) => handleMouseDown(e, 'rotate')} style={{ pointerEvents: 'auto' }} />
        </div>
    );
}
