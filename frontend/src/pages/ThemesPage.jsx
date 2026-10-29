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

    const [currentTheme, setCurrentTheme] = useState(() => {
        return localStorage.getItem('barberpro_theme') || shopTheme || 'dark';
    });
    const [salonSettings, setSalonSettings] = useState(null);

    useEffect(() => {
        const active = localStorage.getItem('barberpro_theme') || shopTheme || 'dark';
        setCurrentTheme(active);
        document.documentElement.setAttribute('data-theme', active);

        if (role === 'admin') {
            settingsApi.get().then(setSalonSettings).catch(console.error);
        }
    }, [shopTheme, role]);

    async function handleSelectTheme(themeId) {
        setCurrentTheme(themeId);
        
        // 1. Immediately apply to HTML document
        document.documentElement.setAttribute('data-theme', themeId);
        
        // 2. Persist locally to localStorage forever
        localStorage.setItem('barberpro_theme', themeId);
        if (shopName) {
            localStorage.setItem(`barberpro_theme_${role}_${shopName}`, themeId);
        }

        // 3. Update React context
        if (setShopTheme) {
            setShopTheme(themeId);
        }

        // 4. If admin, automatically persist to salon settings in backend database
        if (role === 'admin') {
            try {
                const currentSettings = salonSettings || await settingsApi.get().catch(() => null);
                if (currentSettings) {
                    const updated = await settingsApi.update({
                        ...currentSettings,
                        theme: themeId
                    });
                    setSalonSettings(updated);
                }
            } catch (err) {
                console.error('Failed to sync theme to DB:', err);
            }
        }

        const t = THEMES.find(item => item.id === themeId);
        showToast(`✓ Тема «${t ? t.name : themeId}» сохранена навсегда!`);
    }

    function handleBack() {
        if (role === 'admin') {
            navigate('/admin/settings');
        } else if (role === 'barber') {
            navigate('/barber/settings');
        } else if (role === 'superadmin') {
            navigate('/superadmin/tenants');
        } else {
            navigate(-1);
        }
    }

    const currentThemeObj = THEMES.find(t => t.id === currentTheme) || THEMES[0];

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

                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6,
                    padding: '6px 14px', 
                    borderRadius: 999, 
                    background: 'var(--green-glow)', 
                    color: 'var(--green)',
                    fontWeight: 600,
                    fontSize: 12,
                    border: '1px solid var(--border)'
                }}>
                    <Palette size={14} />
                    <span>Активно: {currentThemeObj.name}</span>
                </div>
            </div>

            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Palette size={26} color="var(--green)" />
                    <span>Темы оформления</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                    Нажмите на любую тему — она сохранится автоматически и навсегда. Выбранный цвет не сбросится при перезагрузке, переходе по страницам или выходе из системы.
                </p>
            </div>

            {/* Permanent Auto-Saved Status Banner */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '14px 18px',
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
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span>Текущая тема:</span>
                            <strong style={{ color: 'var(--green)' }}>{currentThemeObj.name}</strong>
                            <span className="badge badge-done" style={{ fontSize: 10 }}>✓ Сохранено навсегда</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            Цвет зафиксирован на этом устройстве. При каждом входе интерфейс сразу откроется в этой теме.
                            {role === 'admin' && ' В базе данных салона также установлено как значение по умолчанию.'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Themes Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 30 }}>
                {THEMES.map((theme) => {
                    const isSelected = currentTheme === theme.id;
                    const IconComponent = theme.icon;

                    return (
                        <div 
                            key={theme.id}
                            onClick={() => handleSelectTheme(theme.id)}
                            style={{
                                background: 'var(--bg-card)',
                                border: isSelected ? '2px solid var(--green)' : '1px solid var(--border)',
                                borderRadius: 16,
                                padding: 20,
                                cursor: 'pointer',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: isSelected ? '0 12px 32px var(--green-glow)' : 'var(--shadow-card)',
                                transform: isSelected ? 'translateY(-2px)' : 'none',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Selected Check Badge */}
                            {isSelected && (
                                <div style={{
                                    position: 'absolute',
                                    top: 14,
                                    right: 14,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: 'var(--green)',
                                    color: '#fff',
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                                }}>
                                    <Check size={12} strokeWidth={3} />
                                    <span>Активно</span>
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

                            {/* Select Action Button */}
                            <button
                                type="button"
                                className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
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
                                    handleSelectTheme(theme.id);
                                }}
                            >
                                {isSelected ? (
                                    <>
                                        <Check size={14} strokeWidth={3} />
                                        <span>✓ Активно и сохранено</span>
                                    </>
                                ) : (
                                    <>
                                        <Palette size={14} />
                                        <span>Выбрать тему</span>
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
