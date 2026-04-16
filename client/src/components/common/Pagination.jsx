/**
 * Pagination
 * Smart page number display — shows up to 5 page buttons centered around current page.
 *
 * Props:
 *   page         - current page (1-indexed)
 *   pages        - total pages
 *   total        - total record count (optional, for display)
 *   onPageChange - (newPage: number) => void
 */

import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Pagination({ page, pages, total, onPageChange }) {
  if (!pages || pages <= 1) return null;

  // Build the window of page numbers to show
  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, page - half);
  let end   = Math.min(pages, start + windowSize - 1);
  if (end - start < windowSize - 1) start = Math.max(1, end - windowSize + 1);

  const pageNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex items-center justify-between mt-4 gap-4 flex-wrap">
      {/* Record count */}
      <p className="text-xs text-dark-500">
        {total !== undefined
          ? `${total.toLocaleString()} total · Page ${page} of ${pages}`
          : `Page ${page} of ${pages}`}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-dark-300
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <FiChevronLeft size={15} />
        </button>

        {/* First page + ellipsis */}
        {start > 1 && (
          <>
            <PageBtn n={1} current={page} onClick={onPageChange} />
            {start > 2 && <span className="px-1 text-dark-600 text-sm">…</span>}
          </>
        )}

        {/* Page window */}
        {pageNumbers.map((n) => (
          <PageBtn key={n} n={n} current={page} onClick={onPageChange} />
        ))}

        {/* Last page + ellipsis */}
        {end < pages && (
          <>
            {end < pages - 1 && <span className="px-1 text-dark-600 text-sm">…</span>}
            <PageBtn n={pages} current={page} onClick={onPageChange} />
          </>
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-dark-300
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <FiChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function PageBtn({ n, current, onClick }) {
  const isActive = n === current;
  return (
    <button
      onClick={() => onClick(n)}
      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
        isActive
          ? 'bg-primary-600 text-white shadow-glow-sm'
          : 'bg-dark-700 hover:bg-dark-600 text-dark-300'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {n}
    </button>
  );
}
