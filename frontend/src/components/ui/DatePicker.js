'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import styles from './DatePicker.module.css';

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

export default function DatePicker({ value, onChange, minDate }) {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);
    
    // Parse initial value or use today
    const selectedDateObj = value ? new Date(value) : new Date();
    const [currentMonth, setCurrentMonth] = useState(selectedDateObj.getMonth());
    const [currentYear, setCurrentYear] = useState(selectedDateObj.getFullYear());
    
    // Custom dropdown state
    const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
    const yearDropdownRef = useRef(null);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setIsOpen(false);
                setYearDropdownOpen(false);
            }
            if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target)) {
                setYearDropdownOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Helpers
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Sunday=6, Monday=0
    };

    const handlePrevMonth = (e) => {
        e.stopPropagation();
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = (e) => {
        e.stopPropagation();
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleDateClick = (day) => {
        const selected = new Date(currentYear, currentMonth, day, 12, 0, 0);
        
        // Prevent selecting disabled dates
        if (minDate && selected < new Date(minDate).setHours(0,0,0,0)) return;

        // Format to YYYY-MM-DD
        const yyyy = selected.getFullYear();
        const mm = String(selected.getMonth() + 1).padStart(2, '0');
        const dd = String(selected.getDate()).padStart(2, '0');
        
        onChange(`${yyyy}-${mm}-${dd}`);
        setIsOpen(false);
    };

    // Render Calendar Grid
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
        const days = [];
        
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const minDateObj = minDate ? new Date(minDate) : new Date();
        minDateObj.setHours(0,0,0,0);

        // Empty cells before the first day
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className={styles.dayCell}></div>);
        }

        // Render days
        for (let d = 1; d <= daysInMonth; d++) {
            const currentDate = new Date(currentYear, currentMonth, d);
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            
            const isSelected = value === dateStr;
            const isToday = todayStr === dateStr;
            const isDisabled = currentDate < minDateObj;

            days.push(
                <div 
                    key={d} 
                    className={`${styles.dayCell} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''} ${isDisabled ? styles.disabled : ''}`}
                    onClick={() => !isDisabled && handleDateClick(d)}
                >
                    <span className={styles.dateNumber}>{d}</span>
                </div>
            );
        }

        return days;
    };

    // Format display string for trigger button
    const formatDisplayDate = (dateString) => {
        if (!dateString) return 'Chọn ngày...';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className={styles.datePickerContainer} ref={popoverRef}>
            <div 
                className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{formatDisplayDate(value)}</span>
                <CalendarIcon size={18} className={styles.icon} />
            </div>

            {isOpen && (
                <div className={styles.popover}>
                    <div className={styles.header}>
                        <button className={styles.navButton} onClick={handlePrevMonth}>
                            <ChevronLeft size={20} />
                        </button>
                        <div className={styles.monthYearSelects}>
                            <span className={styles.monthText}>{MONTHS[currentMonth]}</span>
                            
                            <div className={styles.customDropdown} ref={yearDropdownRef}>
                                <div 
                                    className={`${styles.dropdownTrigger} ${yearDropdownOpen ? styles.dropdownTriggerOpen : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setYearDropdownOpen(!yearDropdownOpen);
                                    }}
                                >
                                    <span>{currentYear}</span>
                                    <span className={`${styles.dropdownChevron} ${yearDropdownOpen ? styles.dropdownChevronOpen : ''}`}>
                                        <ChevronDown size={14} />
                                    </span>
                                </div>
                                
                                {yearDropdownOpen && (
                                    <div className={styles.dropdownMenu}>
                                        {Array.from({length: 10}, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                                            <div 
                                                key={y} 
                                                className={`${styles.dropdownOption} ${currentYear === y ? styles.dropdownOptionActive : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentYear(y);
                                                    setYearDropdownOpen(false);
                                                }}
                                            >
                                                {y}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button className={styles.navButton} onClick={handleNextMonth}>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className={styles.weekDays}>
                        {DAYS_OF_WEEK.map((day, index) => (
                            <div key={day} className={`${styles.weekDay} ${index >= 5 ? styles.weekDayWeekend : ''}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className={styles.daysGrid}>
                        {renderCalendar()}
                    </div>
                </div>
            )}
        </div>
    );
}
