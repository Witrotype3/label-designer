'use client';

import React from 'react';
import Toolbar from '@/components/UI/Toolbar';
import ElementTools from '@/components/UI/ElementTools';
import PropertyPanel from '@/components/UI/PropertyPanel';
import CanvasRenderer from '@/components/Canvas/CanvasRenderer';
import { ErrorBoundary } from '@/components/UI/ErrorBoundary';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function Home() {
    // Enable keyboard shortcuts
    useKeyboardShortcuts();
    return (
        <ErrorBoundary>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden'
            }}>
                {/* Top Toolbar */}
                <Toolbar />

                {/* Main Content Area */}
                <div style={{
                    display: 'flex',
                    flex: 1,
                    overflow: 'hidden'
                }}>
                    {/* Left Sidebar - Element Tools */}
                    <ElementTools />

                    {/* Center - Canvas */}
                    <CanvasRenderer />

                    {/* Right Sidebar - Property Panel */}
                    <PropertyPanel />
                </div>
            </div>
        </ErrorBoundary>
    );
}
