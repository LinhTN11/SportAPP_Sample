'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

/**
 * Reusable Pagination Component
 * 
 * @param {number} totalItems - Total number of items across all pages
 * @param {number} itemsPerPage - Number of items shown per page
 * @param {number} currentPage - Currently active page (1-indexed)
 * @param {function} onPageChange - Callback: (newPage) => void
 * @param {number} [maxPages=5] - Max page number buttons to show
 * @param {string} [className] - Optional extra class for outer container
 */

export default function Pagination({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange,
    maxPages = 5,
    className = '',
}) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    // Compute window of page buttons
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = startPage + maxPages - 1;
    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxPages + 1);
    }

    const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

    const goTo = (page) => {
        if (page < 1 || page > totalPages || page === currentPage) return;
        onPageChange(page);
    };

    return (
        <div className={`${styles.pagination} ${className}`}>
            {/* Prev */}
            <button
                className={`${styles.pageBtn} ${styles.navBtn}`}
                onClick={() => goTo(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Trang trước"
            >
                <ChevronLeft size={16} />
            </button>

            {/* First page + ellipsis */}
            {startPage > 1 && (
                <>
                    <button className={styles.pageBtn} onClick={() => goTo(1)}>1</button>
                    {startPage > 2 && <span className={styles.ellipsis}>…</span>}
                </>
            )}

            {/* Page numbers */}
            {pages.map((page) => (
                <button
                    key={page}
                    className={`${styles.pageBtn} ${page === currentPage ? styles.active : ''}`}
                    onClick={() => goTo(page)}
                    aria-current={page === currentPage ? 'page' : undefined}
                >
                    {page}
                </button>
            ))}

            {/* Last page + ellipsis */}
            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className={styles.ellipsis}>…</span>}
                    <button className={styles.pageBtn} onClick={() => goTo(totalPages)}>{totalPages}</button>
                </>
            )}

            {/* Next */}
            <button
                className={`${styles.pageBtn} ${styles.navBtn}`}
                onClick={() => goTo(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Trang sau"
            >
                <ChevronRight size={16} />
            </button>

            {/* Info */}
            <span className={styles.info}>
                {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems}
            </span>
        </div>
    );
}
