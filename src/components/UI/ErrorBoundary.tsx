'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#ff0000',
                    backgroundColor: '#ffe0e0',
                    border: '1px solid #ff0000',
                    borderRadius: '4px',
                    margin: '20px',
                }}>
                    <h3>Something went wrong</h3>
                    <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => this.setState({ hasError: false, error: undefined })}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

