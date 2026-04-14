'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import styles from './CustomSelect.module.css';

function normalizeOptions(options) {
    if (!Array.isArray(options)) return [];
    return options.map((opt) => {
        if (typeof opt === 'string' || typeof opt === 'number') {
            const value = String(opt);
            return { value, label: value };
        }
        return {
            value: String(opt?.value ?? ''),
            label: String(opt?.label ?? opt?.value ?? ''),
            disabled: Boolean(opt?.disabled),
        };
    });
}

export default function CustomSelect({
    value,
    onChange,
    options = [],
    placeholder = 'Chọn...',
    disabled = false,
    className = '',
    menuMaxHeight = 220,
    fixed = false,      // ← new: escape overflow:hidden by anchoring to viewport
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const rootRef = useRef(null);
    const menuRef = useRef(null);

    const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
    const selected = normalizedOptions.find((opt) => opt.value === String(value ?? ''));

    // Close on outside click
    useEffect(() => {
        const handleOutside = (e) => {
            if (
                rootRef.current && !rootRef.current.contains(e.target) &&
                menuRef.current && !menuRef.current.contains(e.target)
            ) setIsOpen(false);
        };
        if (isOpen) document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [isOpen]);

    // Calculate fixed menu position
    const calcMenuStyle = useCallback(() => {
        if (!fixed || !rootRef.current) return {};
        const rect = rootRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const fitsBelow = spaceBelow >= (menuMaxHeight + 8);
        return fitsBelow
            ? { position: 'fixed', top: rect.bottom + 6, left: rect.left, width: rect.width, maxHeight: menuMaxHeight }
            : { position: 'fixed', bottom: window.innerHeight - rect.top + 6, left: rect.left, width: rect.width, maxHeight: menuMaxHeight };
    }, [fixed, menuMaxHeight]);

    const handleToggle = () => {
        if (disabled) return;
        if (!isOpen) setMenuStyle(calcMenuStyle());
        setIsOpen(prev => !prev);
    };

    const handlePick = (nextValue, isDisabled) => {
        if (disabled || isDisabled) return;
        onChange?.(nextValue);
        setIsOpen(false);
    };

    const menuEl = isOpen && (
        <div
            ref={menuRef}
            className={styles.menu}
            style={fixed ? { ...menuStyle, zIndex: 9999 } : { maxHeight: menuMaxHeight }}
        >
            {normalizedOptions.map((opt) => (
                <button
                    type="button"
                    key={opt.value}
                    className={`${styles.option} ${selected?.value === opt.value ? styles.optionActive : ''} ${opt.disabled ? styles.optionDisabled : ''}`}
                    onClick={() => handlePick(opt.value, opt.disabled)}
                    disabled={opt.disabled}
                >
                    <span>{opt.label}</span>
                    {selected?.value === opt.value && <Check size={14} className={styles.checkIcon} />}
                </button>
            ))}
        </div>
    );

    return (
        <div ref={rootRef} className={`${styles.selectRoot} ${className}`.trim()}>
            <button
                type="button"
                className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
                onClick={handleToggle}
                disabled={disabled}
            >
                <span className={selected ? styles.value : styles.placeholder}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown size={16} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
            </button>

            {/* Render inside root when relative, render in body-level when fixed */}
            {fixed
                ? typeof document !== 'undefined' && isOpen && menuEl
                : menuEl
            }
        </div>
    );
}
