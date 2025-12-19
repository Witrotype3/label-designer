'use client';

import React, { useState } from 'react';
import { useDesignStore, createTextElement, createShapeElement, createImageElement, createPlaceholderElement } from '@/store/designStore';
import TemplateSelector from './TemplateSelector';
import DataInjester from '@/components/Data/DataInjest';
import AssetManager from './AssetManager';
import LayersPanel from './LayersPanel';
import Resizable from './Resizable';
import type { AssetMetadata } from '@/lib/assets';
import styles from '@/styles/ui.module.css';

export default function ElementTools() {
    const { addElementToMaster, template } = useDesignStore();
    const [showAssetManager, setShowAssetManager] = useState(false);

    const handleAddText = () => {
        const centerX = template.labelWidth / 2 - 25;
        const centerY = template.labelHeight / 2 - 5;
        const textElement = createTextElement(centerX, centerY, 'New Text');
        addElementToMaster(textElement);
    };

    const handleAddImage = () => {
        setShowAssetManager(true);
    };

    const handleSelectAsset = (asset: AssetMetadata) => {
        const centerX = template.labelWidth / 2 - asset.width / 2;
        const centerY = template.labelHeight / 2 - asset.height / 2;
        const imageElement = createImageElement(
            centerX,
            centerY,
            asset.dataUrl,
            asset.width,
            asset.height
        );
        addElementToMaster(imageElement);
        setShowAssetManager(false);
    };

    const handleAddRectangle = () => {
        const centerX = template.labelWidth / 2 - 10;
        const centerY = template.labelHeight / 2 - 10;
        const rectElement = createShapeElement(centerX, centerY, 'rectangle');
        addElementToMaster(rectElement);
    };

    const handleAddCircle = () => {
        const centerX = template.labelWidth / 2 - 10;
        const centerY = template.labelHeight / 2 - 10;
        const circleElement = createShapeElement(centerX, centerY, 'circle');
        addElementToMaster(circleElement);
    };

    const handleAddLine = () => {
        const centerX = template.labelWidth / 2 - 10;
        const centerY = template.labelHeight / 2;
        const lineElement = createShapeElement(centerX, centerY, 'line');
        lineElement.transform.height = 1;
        addElementToMaster(lineElement);
    };

    return (
        <Resizable side="left" defaultWidth={280} minWidth={200} maxWidth={500}>
            <div className={styles.sidebar}>
                <div className={styles.sidebarSection}>
                    <div className={styles.sidebarTitle}>Add Elements</div>
                    <div className={styles.toolGrid}>
                        <button className={styles.toolButton} onClick={handleAddText}>
                            <span className={styles.toolIcon}>T</span>
                            <span>Text</span>
                        </button>

                        <button className={styles.toolButton} onClick={handleAddImage}>
                            <span className={styles.toolIcon}>🖼️</span>
                            <span>Image</span>
                        </button>

                        <button className={styles.toolButton} onClick={handleAddRectangle}>
                            <span className={styles.toolIcon}>▭</span>
                            <span>Rectangle</span>
                        </button>

                        <button className={styles.toolButton} onClick={handleAddCircle}>
                            <span className={styles.toolIcon}>●</span>
                            <span>Circle</span>
                        </button>

                        <button className={styles.toolButton} onClick={handleAddLine}>
                            <span className={styles.toolIcon}>─</span>
                            <span>Line</span>
                        </button>

                        <button className={styles.toolButton} onClick={() => {
                            const centerX = template.labelWidth / 2 - 12.5;
                            const centerY = template.labelHeight / 2 - 12.5;
                            const placeholderElement = createPlaceholderElement(centerX, centerY, 'image');
                            addElementToMaster(placeholderElement);
                        }}>
                            <span className={styles.toolIcon}>📷</span>
                            <span>Image Placeholder</span>
                        </button>

                        <button className={styles.toolButton} onClick={() => {
                            const centerX = template.labelWidth / 2 - 12.5;
                            const centerY = template.labelHeight / 2 - 12.5;
                            const placeholderElement = createPlaceholderElement(centerX, centerY, 'qrCode');
                            addElementToMaster(placeholderElement);
                        }}>
                            <span className={styles.toolIcon}>🔲</span>
                            <span>QR Code Placeholder</span>
                        </button>
                    </div>
                </div>

                <TemplateSelector />

                <LayersPanel />

                {/* Asset Manager - Show when image button clicked */}
                {showAssetManager ? (
                    <div style={{ borderTop: '1px solid #ddd', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div className={styles.sidebarTitle}>Select Image</div>
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowAssetManager(false)}
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                            >
                                ✕
                            </button>
                        </div>
                        <AssetManager onSelectAsset={handleSelectAsset} />
                    </div>
                ) : null}

                <DataInjester />
            </div>
        </Resizable>
    );
}
