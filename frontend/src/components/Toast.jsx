/**
 * components/Toast.jsx
 * ------------------------------------------------------------
 * Minimal global toast notification system (success/error).
 * ------------------------------------------------------------
 */
import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, isError = false) => {
        setToast({ message, isError, id: Date.now() });
        setTimeout(() => setToast(null), 2800);
    }, []);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            {toast && (
                <div 
                    className={`toast show ${toast.isError ? 'error' : ''}`} 
                    key={toast.id}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(12px)',
                        zIndex: 9999
                    }}
                >
                    {toast.isError ? (
                        <AlertCircle size={18} color="var(--status-cancelled)" />
                    ) : (
                        <CheckCircle2 size={18} color="var(--green)" />
                    )}
                    <span>{toast.message}</span>
                </div>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
