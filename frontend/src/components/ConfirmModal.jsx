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
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            background: danger ? 'rgba(239, 68, 68, 0.12)' : 'rgba(var(--green-rgb, 74, 222, 128), 0.12)',
                            border: danger ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(var(--green-rgb, 74, 222, 128), 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: danger ? 'var(--status-cancelled)' : 'var(--green)',
                            flexShrink: 0
                        }}>
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 17, margin: 0 }}>{title}</h2>
                        </div>
                    </div>
                    <button className="modal-close" onClick={onCancel}>
                        <X size={18} />
                    </button>
                </div>
                <div style={{ margin: '18px 0', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.55 }}>
                    {text}
                </div>
                <div className="modal-actions" style={{ marginTop: 20, paddingTop: 14 }}>
                    <button
                        type="button"
                        className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                        style={{ flex: 1 }}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                    <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onCancel}>
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}
