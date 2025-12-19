'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getAllAssets, saveAsset, deleteAsset, processImageFile, initializeAssets, getAssetDataUrl, type AssetMetadata } from '@/lib/assets';
import styles from '@/styles/ui.module.css';

interface AssetManagerProps {
    onSelectAsset: (asset: AssetMetadata) => void;
}

export default function AssetManager({ onSelectAsset }: AssetManagerProps) {
    const [assets, setAssets] = useState<AssetMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize assets on mount
    useEffect(() => {
        const loadAssets = async () => {
            try {
                setIsLoading(true);
                await initializeAssets();
                const loadedAssets = await getAllAssets();
                setAssets(loadedAssets);
            } catch (error) {
                console.error('Failed to load assets:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadAssets();
    }, []);

    const refreshAssets = useCallback(async () => {
        try {
            const loadedAssets = await getAllAssets();
            setAssets(loadedAssets);
        } catch (error) {
            console.error('Failed to refresh assets:', error);
        }
    }, []);

    const handleFileSelect = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const imageFiles = Array.from(files).filter((file) =>
            file.type.startsWith('image/')
        );

        if (imageFiles.length === 0) {
            alert('Please select image files only');
            return;
        }

        try {
            setIsUploading(true);
            for (const file of imageFiles) {
                const asset = await processImageFile(file);
                await saveAsset(asset);
            }
            await refreshAssets();
        } catch (error) {
            console.error('Failed to process image:', error);
            alert(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    }, [refreshAssets]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileSelect(e.target.files);
    }, [handleFileSelect]);

    const handleDelete = useCallback(async (assetId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this asset?')) {
            try {
                await deleteAsset(assetId);
                await refreshAssets();
            } catch (error) {
                console.error('Failed to delete asset:', error);
                alert('Failed to delete asset');
            }
        }
    }, [refreshAssets]);

    // State for blob URLs (to avoid memory leaks)
    const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());

    // Load blob URLs for assets
    useEffect(() => {
        const loadBlobUrls = async () => {
            const urlMap = new Map<string, string>();
            for (const asset of assets) {
                try {
                    const dataUrl = await getAssetDataUrl(asset);
                    urlMap.set(asset.id, dataUrl);
                } catch (error) {
                    console.error(`Failed to load blob URL for asset ${asset.id}:`, error);
                    // Fallback to dataUrl
                    urlMap.set(asset.id, asset.dataUrl);
                }
            }
            setBlobUrls(urlMap);
        };

        if (assets.length > 0) {
            loadBlobUrls();
        }

        // Cleanup blob URLs on unmount
        return () => {
            blobUrls.forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [assets]);

    return (
        <div className={styles.sidebarSection}>
            <div className={styles.sidebarTitle}>Image Assets</div>
            
            {/* Upload Area */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    border: `2px dashed ${isDragging ? '#2563eb' : '#d0d0d0'}`,
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: isDragging ? '#f0f7ff' : '#fafafa',
                    cursor: isUploading ? 'wait' : 'pointer',
                    marginBottom: '12px',
                    transition: 'all 0.2s',
                    opacity: isUploading ? 0.6 : 1,
                }}
                onClick={() => !isUploading && fileInputRef.current?.click()}
            >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📤</div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                    {isUploading ? 'Uploading...' : isDragging ? 'Drop images here' : 'Click or drag images to upload'}
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    PNG, JPG, GIF, WebP
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                disabled={isUploading}
            />

            {/* Asset Grid */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>
                    Loading assets...
                </div>
            ) : assets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>
                    No images uploaded yet
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                    }}
                >
                    {assets.map((asset) => {
                        const imageUrl = blobUrls.get(asset.id) || asset.dataUrl;
                        return (
                            <div
                                key={asset.id}
                                onClick={() => onSelectAsset(asset)}
                                style={{
                                    position: 'relative',
                                    aspectRatio: '1',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    backgroundColor: '#f5f5f5',
                                }}
                                title={asset.name}
                            >
                                <img
                                    src={imageUrl}
                                    alt={asset.name}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                    onError={(e) => {
                                        // Fallback to placeholder if image fails to load
                                        e.currentTarget.src = asset.dataUrl;
                                    }}
                                />
                                <button
                                    onClick={(e) => handleDelete(asset.id, e)}
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        background: 'rgba(0, 0, 0, 0.7)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        width: '24px',
                                        height: '24px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    title="Delete"
                                >
                                    ×
                                </button>
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                                        color: 'white',
                                        fontSize: '10px',
                                        padding: '4px',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {asset.name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
