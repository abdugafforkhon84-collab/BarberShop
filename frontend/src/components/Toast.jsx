/**
 * components/Toast.jsx
 * ------------------------------------------------------------
 * Minimal global toast notification system (success/error).
 * ------------------------------------------------------------
 */
import { createContext, useCallback, useContext, useState } from 'react';

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
                <div className={`toast show ${toast.isError ? 'error' : ''}`} key={toast.id}>
                    {toast.message}
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
