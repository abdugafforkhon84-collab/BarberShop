import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Unhandled UI Error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                    background: 'var(--bg-main, #0f1117)',
                    color: 'var(--text-main, #fff)',
                    fontFamily: 'inherit'
                }}>
                    <div style={{
                        maxWidth: 440,
                        width: '100%',
                        background: 'var(--bg-card, #161922)',
                        border: '1px solid var(--border, rgba(255,255,255,0.1))',
                        borderRadius: 16,
                        padding: '32px 24px',
                        textAlign: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                    }}>
                        <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <AlertTriangle size={28} />
                        </div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Что-то пошло не так</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', marginBottom: 20, lineHeight: 1.5 }}>
                            Произошла непредвиденная ошибка интерфейса.
                        </p>
                        <button
                            type="button"
                            onClick={this.handleReload}
                            className="btn btn-primary"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 20px',
                                fontSize: 14,
                                margin: '0 auto'
                            }}
                        >
                            <RefreshCw size={16} />
                            <span>Перезагрузить страницу</span>
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
