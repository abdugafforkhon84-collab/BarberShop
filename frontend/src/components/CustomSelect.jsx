import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, style, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Find the currently selected option
    const selectedOption = options.find(o => String(o.value) === String(value));
    const displayLabel = selectedOption ? selectedOption.label : '—';

    return (
        <div className={`custom-select-container ${disabled ? 'disabled' : ''}`} style={style} ref={containerRef}>
            <div 
                className={`custom-select-trigger form-control ${isOpen ? 'open' : ''}`} 
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronDown size={16} className={`chevron ${isOpen ? 'up' : ''}`} />
            </div>
            
            {isOpen && (
                <div className="custom-select-dropdown">
                    {options.map((opt) => (
                        <div 
                            key={opt.value}
                            className={`custom-select-option ${String(opt.value) === String(value) ? 'selected' : ''}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
