import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Palette, 
    CheckCircle2, 
    Sun, 
    Moon, 
    Sparkles, 
    Crown, 
    Check, 
    Building2,
    Eye,
    Scissors,
    Calendar,
    Clock,
    User,
    Save,
    RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { settingsApi } from '../api';

const THEMES = [
    {
        id: 'dark',
        name: 'Тёмный сапфир',
        subtitle: 'Dark Classic',
        badge: 'Классика',
        icon: Moon,
        desc: 'Сдержанный минималистичный темный стиль с неоново-изумрудными акцентами. Снижает нагрузку на зрение и подчеркивает технологичность.',
        colors: ['#09090b', '#18181b', '#10b981', '#fafafa'],
        accent: '#10b981',
        bg: '#09090b',
        cardBg: '#18181b',
        textColor: '#fafafa',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeColor: '#10b981',
        border: 'rgba(255, 255, 255, 0.1)'
    },
    {
        id: 'light',
        name: 'Светлый кристалл',
        subtitle: 'Light Clean',
        badge: 'Дневной',
        icon: Sun,
        desc: 'Чистый, легкий и современный интерфейс с максимальной контрастностью. Превосходно читается при ярком дневном свете и в освещенных залах.',
        colors: ['#f4f4f6', '#ffffff', '#059669', '#18181b'],
        accent: '#059669',
        bg: '#f4f4f6',
        cardBg: '#ffffff',
        textColor: '#18181b',
        badgeBg: 'rgba(5, 150, 105, 0.12)',
        badgeColor: '#059669',
        border: 'rgba(0, 0, 0, 0.1)'
    },
    {
        id: 'pink',
        name: 'Розовый барби',
        subtitle: 'Rose Blossom',
        badge: 'Бьюти-шик',
        icon: Sparkles,
        desc: 'Утонченная пудрово-розовая палитра с выразительными малиновыми акцентами. Идеальный выбор для бьюти-салонов, nail-студий и колористики.',
        colors: ['#fff5f8', '#ffffff', '#ec4899', '#3b0764'],
        accent: '#ec4899',
        bg: '#fff5f8',
        cardBg: '#ffffff',
        textColor: '#3b0764',
        badgeBg: 'rgba(236, 72, 153, 0.15)',
        badgeColor: '#ec4899',
        border: 'rgba(236, 72, 153, 0.2)'
    },
    {
        id: 'luxury',
        name: 'Королевский Люкс',
        subtitle: 'Royal Gold Luxury',
        badge: 'VIP Золото',
        icon: Crown,
        desc: 'Эксклюзивная роскошная гамма: бархатный черный оникс, благородное сияющее золото и теплый янтарный свет для премиальных барбершопов.',
        colors: ['#0b0906', '#1c160e', '#d4af37', '#fffdf5'],
        accent: '#d4af37',
        bg: '#0b0906',
        cardBg: '#1c160e',
        textColor: '#fffdf5',
        badgeBg: 'rgba(212, 175, 55, 0.18)',
        badgeColor: '#d4af37',
        border: 'rgba(212, 175, 55, 0.3)'
    }
];

export default function ThemesPage() {
    const navigate = useNavigate();
    const showToast = useToast();
    const { role, shopName, shopTheme, setShopTheme } = useAuth();

    const [savedTheme, setSavedTheme] = useState(() => {
        return localStorage.getItem('barberpro_theme') || shopTheme || 'dark';
    });
    const [selectedTheme, setSelectedTheme] = useState(() => {
        return localStorage.getItem('barberpro_theme') || shopTheme || 'dark';
    });
    const [saving, setSaving] = useState(false);
    const [salonSettings, setSalonSettings] = useState(null);

    useEffect(() => {
        const active = localStorage.getItem('barberpro_theme') || shopTheme || 'dark';
        setSavedTheme(active);
        setSelectedTheme(active);
        document.documentElement.setAttribute('data-theme', active);

        if (role === 'admin') {
            settingsApi.get().then(setSalonSettings).catch(console.error);
        }
    }, [shopTheme, role]);

    function handlePreviewTheme(themeId) {
        setSelectedTheme(themeId);
        document.documentElement.setAttribute('data-theme', themeId);
    }

    async function handleSaveTheme(themeId) {
        const target = themeId || selectedTheme;
        setSaving(true);
        try {
            // 1. Save locally so it stays permanently on this device/browser
            localStorage.setItem('barberpro_theme', target);
            if (shopName) {
                localStorage.setItem(`barberpro_theme_${role}_${shopName}`, target);
            }
            document.documentElement.setAttribute('data-theme', target);
            if (setShopTheme) {
                setShopTheme(target);
            }
            setSavedTheme(target);
            setSelectedTheme(target);

            // 2. If admin, automatically persist to salon settings in DB
            if (role === 'admin' && salonSettings) {
                const updated = await settingsApi.update({
                    ...salonSettings,
                    theme: target
                });
                setSalonSettings(updated);
            }

            const t = THEMES.find(item => item.id === target);
            showToast(`✓ Тема «${t ? t.name : target}» сохранена навсегда!`);
        } catch (err) {
            console.error(err);
            showToast('Тема сохранена на устройстве');
        } finally {
            setSaving(false);
        }
    }

    function handleCancelPreview() {
        setSelectedTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    function handleBack() {
        // Restore saved theme if user leaves without saving
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (role === 'admin') {
            navigate('/admin/settings');
        } else if (role === 'barber') {
            navigate('/barber/settings');
        } else {
            navigate(-1);
        }
    }

    const isDirty = selectedTheme !== savedTheme;
    const currentThemeObj = THEMES.find(t => t.id === selectedTheme) || THEMES[0];
    const savedThemeObj = THEMES.find(t => t.id === savedTheme) || THEMES[0];

    return (
        <div style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 60 }}>
            {/* Top Navigation Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <button 
                    onClick={handleBack} 
                    className="btn btn-outline"
                    style={{ padding: '8px 14px', fontSize: 13, gap: 6, display: 'inline-flex', alignItems: 'center' }}
                >
                    <ArrowLeft size={16} />
                    <span>Назад</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 6,
                        padding: '6px 14px', 
                        borderRadius: 999, 
                        background: isDirty ? 'rgba(234, 179, 8, 0.15)' : 'var(--green-glow)', 
                        color: isDirty ? '#eab308' : 'var(--green)',
                        fontWeight: 600,
                        fontSize: 12,
                        border: isDirty ? '1px solid rgba(234, 179, 8, 0.3)' : '1px solid var(--border)'
                    }}>
                        <Palette size={14} />
                        <span>{isDirty ? `Предпросмотр: ${currentThemeObj.name}` : `Сохранено: ${savedThemeObj.name}`}</span>
                    </div>

                    {isDirty && (
                        <button
                            className="btn btn-primary"
                            onClick={() => handleSaveTheme(selectedTheme)}
                            disabled={saving}
                            style={{ 
                                padding: '6px 14px', 
                                fontSize: 12, 
                                fontWeight: 700, 
                                gap: 6, 
                                display: 'inline-flex', 
                                alignItems: 'center',
                                boxShadow: '0 4px 14px var(--green-glow)'
                            }}
                        >
                            <Save size={14} />
                            <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
                        </button>
                    )}
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Palette size={26} color="var(--green)" />
                    <span>Темы оформления</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                    Выберите цветовую тему интерфейса. После нажатия «Сохранить» цвет закрепляется навсегда и не сбрасывается при выходе или перезагрузке.
                </p>
            </div>

            {/* Persistent Save Notification Banner when dirty */}
            {isDirty ? (
                <div style={{ 
                    background: 'var(--bg-card)', 
                    border: '2px solid var(--green)', 
                    borderRadius: 14, 
                    padding: '14px 20px', 
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    boxShadow: '0 8px 30px var(--green-glow)',
                    animation: 'fadeUp 0.25s ease'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                            width: 38, 
                            height: 38, 
                            borderRadius: '50%', 
                            background: 'var(--green-glow)', 
                            color: 'var(--green)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                        }}>
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 14 }}>
                                Выбрана новая тема: «{currentThemeObj.name}»
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Нажмите «Сохранить тему», чтобы зафиксировать её навсегда на всех устройствах.
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={handleCancelPreview}
                            style={{ fontSize: 12, padding: '8px 14px', gap: 6, display: 'inline-flex', alignItems: 'center' }}
                        >
                            <RotateCcw size={14} />
                            <span>Отменить</span>
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleSaveTheme(selectedTheme)}
                            disabled={saving}
                            style={{ 
                                fontSize: 13, 
                                padding: '8px 20px', 
                                fontWeight: 700, 
                                gap: 6, 
                                display: 'inline-flex', 
                                alignItems: 'center',
                                boxShadow: '0 4px 16px var(--green-glow)'
                            }}
                        >
                            <Save size={15} />
                            <span>{saving ? 'Сохранение...' : 'Сохранить тему навсегда'}</span>
                        </button>
                    </div>
                </div>
            ) : (
                /* Reassuring Permanent Saved State Banner */
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '12px 18px',
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: 'var(--green-glow)',
                            color: 'var(--green)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>Тема сохранена и активна:</span>
                                <strong style={{ color: 'var(--green)' }}>{savedThemeObj.name}</strong>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Этот цвет сохранён в вашем профиле и будет использоваться автоматически.
                                {role === 'admin' && ' В базе данных салона установлена как стандартная.'}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleSaveTheme(savedTheme)}
                        disabled={saving}
                        style={{ fontSize: 12, padding: '7px 14px', gap: 6, display: 'inline-flex', alignItems: 'center' }}
                        title="Принудительно перезаписать сохранение"
                    >
                        <Check size={14} />
                        <span>{saving ? 'Сохранение...' : 'Зафиксировано'}</span>
                    </button>
                </div>
            )}

            {/* Admin Salon Default Sync Banner */}
            {role === 'admin' && salonSettings && (
                <div className="card" style={{ 
                    marginBottom: 24, 
                    padding: '14px 18px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: 10, 
                            background: 'var(--green-glow)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'var(--green)'
                        }}>
                            <Building2 size={18} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Тема салона «{shopName || 'BarberPro'}»</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Базовая тема для всех устройств: <strong>{THEMES.find(t => t.id === (salonSettings?.theme || 'dark'))?.name || 'Тёмный сапфир'}</strong>
                            </div>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => handleSaveTheme(selectedTheme)}
                        disabled={saving || (salonSettings?.theme === savedTheme && !isDirty)}
                        style={{ fontSize: 12, padding: '7px 16px', gap: 6, display: 'inline-flex', alignItems: 'center' }}
                    >
                        <Save size={14} />
                        <span>{saving ? 'Сохранение...' : salonSettings?.theme === savedTheme && !isDirty ? '✓ Синхронизировано' : 'Сохранить для всего салона'}</span>
                    </button>
                </div>
            )}

            {/* Themes Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 30 }}>
                {THEMES.map((theme) => {
                    const isCurrent = selectedTheme === theme.id;
                    const isPermanentlySaved = savedTheme === theme.id;
                    const IconComponent = theme.icon;

                    return (
                        <div 
                            key={theme.id}
                            onClick={() => handlePreviewTheme(theme.id)}
                            style={{
                                background: 'var(--bg-card)',
                                border: isCurrent ? '2px solid var(--green)' : '1px solid var(--border)',
                                borderRadius: 16,
                                padding: 20,
                                cursor: 'pointer',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isCurrent ? '0 12px 32px var(--green-glow)' : 'var(--shadow-card)',
                                transform: isCurrent ? 'translateY(-2px)' : 'none',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Selected Check Badge */}
                            {isCurrent && (
                                <div style={{
                                    position: 'absolute',
                                    top: 14,
                                    right: 14,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: isPermanentlySaved ? 'var(--green)' : '#eab308',
                                    color: isPermanentlySaved ? '#fff' : '#000',
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                                }}>
                                    <Check size={12} strokeWidth={3} />
                                    <span>{isPermanentlySaved ? 'Сохранено' : 'Выбрано'}</span>
                                </div>
                            )}

                            <div>
                                {/* Theme Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: theme.badgeBg,
                                        color: theme.badgeColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${theme.border}`
                                    }}>
                                        <IconComponent size={22} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)' }}>
                                            {theme.name}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {theme.subtitle}
                                        </div>
                                    </div>
                                </div>

                                <p style={{ 
                                    fontSize: 12.5, 
                                    color: 'var(--text-muted)', 
                                    lineHeight: 1.5, 
                                    marginBottom: 16,
                                    minHeight: 52 
                                }}>
                                    {theme.desc}
                                </p>

                                {/* Miniature Mockup Card */}
                                <div style={{
                                    background: theme.bg,
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: 12,
                                    padding: '12px 14px',
                                    marginBottom: 16,
                                    color: theme.textColor,
                                    boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.accent }} />
                                            <span style={{ fontSize: 11, fontWeight: 700 }}>BarberPro UI</span>
                                        </div>
                                        <span style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: 999,
                                            background: theme.badgeBg,
                                            color: theme.badgeColor
                                        }}>
                                            {theme.badge}
                                        </span>
                                    </div>

                                    {/* Mini booking item */}
                                    <div style={{
                                        background: theme.cardBg,
                                        border: `1px solid ${theme.border}`,
                                        borderRadius: 8,
                                        padding: '8px 10px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 600 }}>Мужская стрижка</div>
                                            <div style={{ fontSize: 9, opacity: 0.7 }}>14:30 · Мастер</div>
                                        </div>
                                        <div style={{ 
                                            fontSize: 11, 
                                            fontWeight: 800, 
                                            color: theme.accent 
                                        }}>
                                            5 000 ₸
                                        </div>
                                    </div>
                                </div>

                                {/* Color Swatches */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 4 }}>Палитра:</span>
                                    {theme.colors.map((c, idx) => (
                                        <div 
                                            key={idx}
                                            title={c}
                                            style={{
                                                width: 18,
                                                height: 18,
                                                borderRadius: '50%',
                                                background: c,
                                                border: '1px solid rgba(120, 120, 120, 0.25)',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Select / Save Action Button */}
                            <button
                                type="button"
                                className={`btn ${isPermanentlySaved ? 'btn-primary' : isCurrent ? 'btn-primary' : 'btn-outline'}`}
                                style={{
                                    width: '100%',
                                    minHeight: 38,
                                    fontSize: 13,
                                    borderRadius: 10,
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveTheme(theme.id);
                                }}
                                disabled={saving}
                            >
                                {isPermanentlySaved ? (
                                    <>
                                        <Check size={14} strokeWidth={3} />
                                        <span>✓ Сохранено навсегда</span>
                                    </>
                                ) : isCurrent ? (
                                    <>
                                        <Save size={14} />
                                        <span>Сохранить эту тему</span>
                                    </>
                                ) : (
                                    <>
                                        <Palette size={14} />
                                        <span>Выбрать и сохранить</span>
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Live Interactive Preview Box */}
            <div className="card" style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
                    <Eye size={18} color="var(--green)" />
                    <span>Живой предпросмотр активной темы</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18 }}>
                    Ниже показано, как элементы интерфейса выглядят прямо сейчас в выбранной теме:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                    {/* Booking Card Sample */}
                    <div className="hcard" style={{ margin: 0 }}>
                        <div className="hcard-top">
                            <div>
                                <div className="hcard-name">Александр Иванов</div>
                                <div className="hcard-sub">+7 777 123-45-67</div>
                                <div className="hcard-service" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Scissors size={12} color="var(--green)" />
                                    <span>Стрижка Fade + Оформление бороды</span>
                                </div>
                            </div>
                            <div className="hcard-right">
                                <div className="hcard-amount" style={{ color: 'var(--green)' }}>7 500 ₸</div>
                                <div className="hcard-date">Сегодня, 15:00</div>
                            </div>
                        </div>
                        <div className="hcard-bottom">
                            <span className="badge badge-done">Выполнено</span>
                            <span className="badge badge-confirmed">Оплачено</span>
                        </div>
                    </div>

                    {/* Interactive Controls Sample */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }}>Кнопка действия</button>
                            <button className="btn btn-outline" style={{ flex: 1 }}>Контурная</button>
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <input 
                                className="input" 
                                readOnly 
                                value="Образец поля ввода BarberPro" 
                                style={{ fontSize: 12 }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
