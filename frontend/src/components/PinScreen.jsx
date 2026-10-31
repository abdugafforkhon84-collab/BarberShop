/**
 * components/PinScreen.jsx
 * ------------------------------------------------------------
 * Экран быстрого входа и настройки 4-значного ПИН-кода:
 * - mode='unlock': Быстрый вход по 4 цифрам
 * - mode='setup': Установка нового 4-значного ПИН-кода
 * - mode='change': Смена существующего ПИН-кода
 * 
 * Дизайн: Современный квадратный (squircle/boxes) стиль,
 * 4 стильных ячейки ввода, эргономичные квадратные кнопки со
 * скруглением (soft-square), стеклянный блюр и фирменная подсветка.
 * ПИН-код изолирован персонально для каждой роли и пользователя.
 * ------------------------------------------------------------
 */
import { useState, useEffect, useCallback } from 'react';
import { Delete, LogOut, Lock, KeyRound, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const KEYPAD_LETTERS = {
    1: '',
    2: 'ABC',
    3: 'DEF',
    4: 'GHI',
    5: 'JKL',
    6: 'MNO',
    7: 'PQRS',
    8: 'TUV',
    9: 'WXYZ',
    0: '+'
};

export default function PinScreen({ mode = 'unlock', onUnlock, onComplete, onCancel, onLogout }) {
    const { fullName, shopName, role, unlock, verifyPin, setPin, removePin } = useAuth();

    // Internal states
    const [digits, setDigits] = useState('');
    const [step, setStep] = useState(mode === 'change' ? 'verify_old' : mode === 'setup' ? 'enter_new' : 'unlock');
    const [firstPin, setFirstPin] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Clear error on digit press
    const handleAddDigit = useCallback((digitChar) => {
        if (digits.length >= 4) return;
        setErrorMsg('');
        const next = digits + digitChar;
        setDigits(next);
    }, [digits]);

    const handleDeleteDigit = useCallback(() => {
        setErrorMsg('');
        setDigits((prev) => prev.slice(0, -1));
    }, []);

    const handleClear = useCallback(() => {
        setErrorMsg('');
        setDigits('');
    }, []);

    // Trigger shake animation on wrong pin
    const triggerError = useCallback((msg) => {
        setErrorMsg(msg);
        setIsShaking(true);
        setTimeout(() => {
            setIsShaking(false);
            setDigits('');
        }, 500);
    }, []);

    // When 4 digits are typed, evaluate based on step
    useEffect(() => {
        if (digits.length !== 4) return;

        const timer = setTimeout(() => {
            if (step === 'unlock') {
                const ok = unlock(digits);
                if (ok) {
                    setSuccessMsg('Доступ открыт ✓');
                    if (onUnlock) onUnlock();
                } else {
                    triggerError('Неверный ПИН-код');
                }
            } else if (step === 'verify_old') {
                const ok = verifyPin ? verifyPin(digits) : unlock(digits);
                if (ok) {
                    setDigits('');
                    setStep('enter_new');
                } else {
                    triggerError('Текущий ПИН-код неверен');
                }
            } else if (step === 'enter_new') {
                setFirstPin(digits);
                setDigits('');
                setStep('confirm_new');
            } else if (step === 'confirm_new') {
                if (digits === firstPin) {
                    setPin(digits);
                    setSuccessMsg('ПИН-код сохранён ✓');
                    setTimeout(() => {
                        if (onComplete) onComplete(digits);
                    }, 400);
                } else {
                    triggerError('ПИН-коды не совпали. Попробуйте снова');
                    setFirstPin('');
                    setStep('enter_new');
                }
            }
        }, 120);

        return () => clearTimeout(timer);
    }, [digits, step, firstPin, unlock, verifyPin, setPin, triggerError, onUnlock, onComplete]);

    // Keyboard support (0-9, Backspace, Escape)
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key >= '0' && e.key <= '9') {
                handleAddDigit(e.key);
            } else if (e.key === 'Backspace') {
                handleDeleteDigit();
            } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
                handleClear();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleAddDigit, handleDeleteDigit, handleClear]);

    // Title & prompt texts
    let title = 'Быстрый вход';
    let subtitle = fullName ? `Здравствуйте, ${fullName}` : (shopName || 'BarberPro');

    if (role === 'superadmin') {
        subtitle = fullName ? `${fullName} (Владелец)` : 'Владелец платформы';
    } else if (role === 'admin') {
        subtitle = shopName ? `Администратор • ${shopName}` : (fullName || 'Администратор');
    } else if (role === 'barber') {
        subtitle = fullName ? `Барбер: ${fullName}` : (shopName || 'Барбер');
    }

    if (step === 'verify_old') {
        title = 'Смена ПИН-кода';
        subtitle = 'Введите текущий 4-значный ПИН';
    } else if (step === 'enter_new') {
        title = mode === 'setup' ? 'Настройка ПИН-кода' : 'Новый ПИН-код';
        subtitle = 'Придумайте 4 цифры для быстрого доступа';
    } else if (step === 'confirm_new') {
        title = 'Подтверждение';
        subtitle = 'Повторите 4 цифры ПИН-кода';
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at top, var(--green-glow) 0%, rgba(10, 11, 14, 0.98) 75%)',
            backdropFilter: 'blur(24px)',
            padding: 20,
            userSelect: 'none'
        }}>
            <div style={{
                width: '100%',
                maxWidth: 380,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl, 24px)',
                padding: '32px 28px 24px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5), 0 0 40px var(--green-glow)',
                textAlign: 'center',
                animation: 'fadeUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative'
            }}>
                {/* Close/Cancel if modal mode */}
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            position: 'absolute',
                            top: 18,
                            right: 18,
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <X size={16} />
                    </button>
                )}

                {/* Brand Badge */}
                <div style={{
                    width: 58,
                    height: 58,
                    margin: '0 auto 16px',
                    borderRadius: 16,
                    background: 'var(--green)',
                    boxShadow: '0 8px 24px var(--green-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                }}>
                    {step === 'unlock' ? (
                        <Lock size={28} strokeWidth={2.4} color="#ffffff" />
                    ) : (
                        <KeyRound size={28} strokeWidth={2.4} color="#ffffff" />
                    )}
                </div>

                {/* Title & Subtitle */}
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                    {title}
                </h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, fontWeight: 500 }}>
                    {subtitle}
                </div>

                {/* 4 Square PIN Input Boxes (OTP style) */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                    animation: isShaking ? 'pinShake 0.45s ease-in-out' : 'none'
                }}>
                    {[0, 1, 2, 3].map((idx) => {
                        const isFilled = digits.length > idx;
                        const isCurrent = digits.length === idx;
                        return (
                            <div
                                key={idx}
                                style={{
                                    width: 54,
                                    height: 58,
                                    borderRadius: 14,
                                    border: isFilled
                                        ? (errorMsg ? '2px solid #ef4444' : '2px solid var(--green)')
                                        : isCurrent
                                            ? '2px solid rgba(var(--green-rgb, 74, 222, 128), 0.6)'
                                            : '1.5px solid var(--border)',
                                    background: isFilled
                                        ? (errorMsg ? 'rgba(239, 68, 68, 0.12)' : 'rgba(var(--green-rgb, 74, 222, 128), 0.12)')
                                        : 'var(--bg-panel)',
                                    boxShadow: isFilled
                                        ? (errorMsg ? '0 0 16px rgba(239, 68, 68, 0.4)' : '0 0 16px rgba(var(--green-rgb, 74, 222, 128), 0.25)')
                                        : isCurrent
                                            ? '0 0 12px rgba(var(--green-rgb, 74, 222, 128), 0.15)'
                                            : 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transform: isFilled ? 'scale(1.02)' : 'scale(1)',
                                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                {isFilled ? (
                                    <div style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: 4,
                                        background: errorMsg ? '#ef4444' : 'var(--green)',
                                        boxShadow: errorMsg ? '0 0 8px #ef4444' : '0 0 10px var(--green)'
                                    }} />
                                ) : isCurrent ? (
                                    <div style={{
                                        width: 2,
                                        height: 20,
                                        background: 'var(--green)',
                                        borderRadius: 2,
                                        animation: 'pinCursor 1s infinite'
                                    }} />
                                ) : (
                                    <div style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 2,
                                        background: 'rgba(255, 255, 255, 0.12)'
                                    }} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Feedback message (Error or Success) */}
                <div style={{ minHeight: 22, marginBottom: 16 }}>
                    {errorMsg && (
                        <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, animation: 'fadeIn 0.15s ease' }}>
                            {errorMsg}
                        </span>
                    )}
                    {successMsg && (
                        <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 700, animation: 'fadeIn 0.15s ease' }}>
                            {successMsg}
                        </span>
                    )}
                </div>

                {/* Keypad Grid (3 x 4) - Square rounded buttons */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    maxWidth: 310,
                    margin: '0 auto 20px'
                }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => handleAddDigit(String(n))}
                            style={{
                                height: 56,
                                borderRadius: 14,
                                border: '1px solid var(--border)',
                                background: 'var(--bg-panel)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifySelf: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                width: '100%',
                                transition: 'all 0.12s ease',
                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                                userSelect: 'none',
                                WebkitTapHighlightColor: 'transparent'
                            }}
                            onMouseDown={(e) => {
                                e.currentTarget.style.transform = 'scale(0.94)';
                                e.currentTarget.style.background = 'rgba(var(--green-rgb, 74, 222, 128), 0.12)';
                                e.currentTarget.style.borderColor = 'var(--green)';
                            }}
                            onMouseUp={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.background = 'var(--bg-panel)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.background = 'var(--bg-panel)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                            }}
                        >
                            <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{n}</span>
                            {KEYPAD_LETTERS[n] && (
                                <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', fontWeight: 600 }}>
                                    {KEYPAD_LETTERS[n]}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Clear Button */}
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            height: 56,
                            borderRadius: 14,
                            border: '1px solid transparent',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.12s ease',
                            width: '100%'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                        Сброс
                    </button>

                    {/* Zero */}
                    <button
                        type="button"
                        onClick={() => handleAddDigit('0')}
                        style={{
                            height: 56,
                            borderRadius: 14,
                            border: '1px solid var(--border)',
                            background: 'var(--bg-panel)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            width: '100%',
                            transition: 'all 0.12s ease',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                            userSelect: 'none',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                        onMouseDown={(e) => {
                            e.currentTarget.style.transform = 'scale(0.94)';
                            e.currentTarget.style.background = 'rgba(var(--green-rgb, 74, 222, 128), 0.12)';
                            e.currentTarget.style.borderColor = 'var(--green)';
                        }}
                        onMouseUp={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = 'var(--bg-panel)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = 'var(--bg-panel)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    >
                        <span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>0</span>
                        <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', fontWeight: 600 }}>+</span>
                    </button>

                    {/* Backspace Delete */}
                    <button
                        type="button"
                        onClick={handleDeleteDigit}
                        style={{
                            height: 56,
                            borderRadius: 14,
                            border: '1px solid var(--border)',
                            background: 'rgba(239, 68, 68, 0.05)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.12s ease',
                            width: '100%'
                        }}
                        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.94)'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                        <Delete size={20} />
                    </button>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    {mode === 'unlock' && (
                        <button
                            type="button"
                            onClick={onLogout}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 8,
                                transition: 'color 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                            <LogOut size={14} />
                            <span>Войти с логином и паролем</span>
                        </button>
                    )}

                    {mode === 'setup' && onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-dim)',
                                fontSize: 13,
                                cursor: 'pointer',
                                padding: '6px 12px'
                            }}
                        >
                            Пропустить (входить по паролю)
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes pinShake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-8px); }
                    40%, 80% { transform: translateX(8px); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pinCursor {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}
