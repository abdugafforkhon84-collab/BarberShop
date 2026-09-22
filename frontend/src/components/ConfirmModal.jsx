/**
 * components/ConfirmModal.jsx
 * ------------------------------------------------------------
 * Reusable modal for confirming destructive or critical actions.
 * ------------------------------------------------------------
 */
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
    title = 'Подтверждение',
    text = 'Вы уверены?',
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    danger = false,
    onConfirm,
    onCancel,
}) {
    return (
        <div className="modal-overlay">
            <div className="modal-box" style={{ maxWidth: 380 }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {danger && <AlertTriangle size={20} color="var(--status-cancelled)" />}
                        <h2>{title}</h2>
                    </div>
                    <button className="modal-close" onClick={onCancel}>
                        <X size={20} />
                    </button>
                </div>
                <div style={{ margin: '16px 0', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {text}
                </div>
                <div className="modal-actions">
                    <button
                        type="button"
                        className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={onCancel}>
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}
