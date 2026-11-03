import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Palette, 
    Check, 
    Moon, 
    Sun, 
    Sparkles, 
    Crown 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { settingsApi } from '../api';

const THEMES = [
    {
        id: 'dark',
        name: 'Тёмный сапфир',
        icon: Moon,
        colors: ['#09090b', '#18181b', '#10b981', '#fafafa'],
        accent: '#10b981'
    },
    {
        id: 'light',
        name: 'Светлый кристалл',
        icon: Sun,
        colors: ['#f4f4f6', '#ffffff', '#059669', '#18181b'],
        accent: '#059669'
    },
    {
        id: 'pink',
        name: 'Розовый барби',
        icon: Sparkles,
        colors: ['#fff5f8', '#ffffff', '#ec4899', '#3b0764'],
        accent: '#ec4899'
    },
    {
        id: 'luxury',
        name: 'Золотой Люкс',
        icon: Crown,
        colors: ['#0b0906', '#1c160e', '#d4af37', '#fffdf5'],
        accent: '#d4af37'
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
        document.documentElement.setAttribute('data-theme', themeId);
        localStorage.setItem('barberpro_theme', themeId);
        if (shopName) {
            localStorage.setItem(`barberpro_theme_${role}_${shopName}`, themeId);
        }

        if (setShopTheme) {
            setShopTheme(themeId);
        }

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
        showToast(`Тема «${t ? t.name : themeId}» сохранена ✓`);
    }

    function handleBack() {
        if (role === 'admin') {
            navigate('/admin/bookings');
        } else if (role === 'barber') {
            navigate('/barber/calendar');
        } else if (role === 'superadmin') {
            navigate('/superadmin/tenants');
        } else {
            navigate(-1);
        }
    }

    return (
        <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 40 }}>
            {/* Minimal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <button 
                    onClick={handleBack} 
                    className="btn btn-outline"
                    style={{ padding: '8px 14px', fontSize: 13, gap: 6, display: 'inline-flex', alignItems: 'center' }}
                >
                    <ArrowLeft size={16} />
                    <span>Назад</span>
                </button>

                <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Palette size={20} color="var(--green)" />
                    <span>Темы оформления</span>
                </h1>
            </div>

            {/* Minimal Theme Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {THEMES.map((theme) => {
                    const isActive = currentTheme === theme.id;
                    const IconComponent = theme.icon;

                    return (
                        <div
                            key={theme.id}
                            onClick={() => handleSelectTheme(theme.id)}
                            style={{
                                background: 'var(--bg-card)',
                                border: isActive ? `2px solid ${theme.accent}` : '1px solid var(--border)',
                                borderRadius: 16,
                                padding: '16px 18px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.15s ease',
                                boxShadow: isActive ? `0 0 16px ${theme.accent}33` : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    background: `${theme.accent}22`,
                                    color: theme.accent,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <IconComponent size={20} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>
                                        {theme.name}
                                    </div>
                                    <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                                        {theme.colors.map((c, i) => (
                                            <span
                                                key={i}
                                                style={{
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: '50%',
                                                    background: c,
                                                    border: '1px solid rgba(120, 120, 120, 0.25)',
                                                    display: 'inline-block'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {isActive && (
                                <div style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: theme.accent,
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 2px 8px ${theme.accent}66`
                                }}>
                                    <Check size={16} strokeWidth={2.8} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
