/**
 * components/PinScreen.jsx
 * ------------------------------------------------------------
 * Экран быстрого входа и настройки 4-значного ПИН-кода:
 * - mode='unlock': Быстрый вход по 4 цифрам
 * - mode='setup': Установка нового 4-значного ПИН-кода
 * - mode='change': Смена существующего ПИН-кода
 * Дизайн полностью соответствует темной теме и стилю BarberPro:
 * 4 светящиеся точки, сенсорный и клавиатурный ввод 0-9, анимация встряхивания.
 * ------------------------------------------------------------
 */
import { useState, useEffect, useCallback } from 'react';
import { Scissors, Delete, ArrowLeft, LogOut, CheckCircle2, Shield, Lock, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PinScreen({ mode = 'unlock', onUnlock, onComplete, onCancel, onLogout }) {
    const { fullName, shopName, role, unlock, setPin, removePin } = useAuth();
    
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
                const saved = localStorage.getItem('barberpro_pin');
                if (digits === saved) {
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
    }, [digits, step, firstPin, unlock, setPin, triggerError, onUnlock, onComplete]);

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
    let title = 'Вход по ПИН-коду';
    let subtitle = fullName ? `Здравствуйте, ${fullName}` : (shopName || 'BarberPro');

    if (step === 'verify_old') {
        title = 'Смена ПИН-кода';
        subtitle = 'Введите текущий 4-значный ПИН';
    } else if (step === 'enter_new') {
        title = mode === 'setup' ? 'Быстрый вход' : 'Новый ПИН-код';
        subtitle = 'Придумайте 4 цифры для входа';
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
            background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.08) 0%, rgba(10, 10, 12, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            padding: 20,
            userSelect: 'none'
        }}>
            <div style={{
                width: '100%',
                maxWidth: 360,
                textAlign: 'center',
                animation: 'fadeUp 0.25s ease'
            }}>
                {/* Brand Logo Icon */}
                <div style={{
                    width: 64,
                    height: 64,
                    margin: '0 auto 16px',
                    borderRadius: 20,
                    background: 'var(--green)',
                    boxShadow: '0 8px 24px var(--green-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#06180f'
                }}>
                    {step === 'unlock' ? (
                        <Lock size={32} strokeWidth={2.4} />
                    ) : (
                        <KeyRound size={32} strokeWidth={2.4} />
                    )}
                </div>

                {/* Title & Subtitle */}
                <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                    {title}
                </h2>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28, fontWeight: 500 }}>
                    {subtitle}
                </div>

                {/* 4 PIN Dots */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 18,
                    marginBottom: 24,
                    animation: isShaking ? 'pinShake 0.45s ease-in-out' : 'none'
                }}>
                    {[0, 1, 2, 3].map((idx) => {
                        const isFilled = digits.length > idx;
                        return (
                            <div
                                key={idx}
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    border: isFilled
                                        ? (errorMsg ? '2px solid #ef4444' : '2px solid var(--green)')
                                        : '2px solid rgba(255, 255, 255, 0.2)',
                                    background: isFilled
                                        ? (errorMsg ? '#ef4444' : 'var(--green)')
                                        : 'rgba(255, 255, 255, 0.04)',
                                    boxShadow: isFilled
                                        ? (errorMsg ? '0 0 16px rgba(239, 68, 68, 0.6)' : '0 0 16px var(--green)')
                                        : 'none',
                                    transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            />
                        );
                    })}
                </div>

                {/* Status Message */}
                <div style={{ minHeight: 24, marginBottom: 20 }}>
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

                {/* Keypad Grid (3 x 4) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 14,
                    maxWidth: 280,
                    margin: '0 auto 28px'
                }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => handleAddDigit(String(n))}
                            style={{
                                height: 62,
                                borderRadius: '50%',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)',
                                fontSize: 24,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.12s ease',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                userSelect: 'none',
                                WebkitTapHighlightColor: 'transparent'
                            }}
                            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; e.currentTarget.style.background = 'var(--bg-panel)'; }}
                            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                        >
                            {n}
                        </button>
                    ))}

                    {/* Clear Button */}
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            height: 62,
                            borderRadius: '50%',
                            border: '1px solid transparent',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.12s ease'
                        }}
                    >
                        Сброс
                    </button>

                    {/* Zero */}
                    <button
                        type="button"
                        onClick={() => handleAddDigit('0')}
                        style={{
                            height: 62,
                            borderRadius: '50%',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            fontSize: 24,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.12s ease',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            userSelect: 'none',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; e.currentTarget.style.background = 'var(--bg-panel)'; }}
                        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                    >
                        0
                    </button>

                    {/* Backspace Delete */}
                    <button
                        type="button"
                        onClick={handleDeleteDigit}
                        style={{
                            height: 62,
                            borderRadius: '50%',
                            border: '1px solid transparent',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.12s ease'
                        }}
                    >
                        <Delete size={22} />
                    </button>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                    {mode === 'unlock' && (
                        <button
                            type="button"
                            onClick={onLogout}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: 13,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
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

                    {mode === 'change' && onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: 13,
                                cursor: 'pointer',
                                padding: '6px 12px'
                            }}
                        >
                            Отмена
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
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

