'use client';

import { useState, useMemo, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  numeric?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  pageSize?: number;
  searchPlaceholder?: string;
  emptyState?: ReactNode;
  rowKey?: (row: T, index: number) => string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortState {
  key: string;
  direction: SortDirection;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchable = false,
  pageSize = 50,
  searchPlaceholder = 'SEARCH...',
  emptyState,
  rowKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>({ key: '', direction: null });
  const [page, setPage] = useState(1);

  // Filter data by search query
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((v) =>
        v != null && String(v).toLowerCase().includes(q)
      )
    );
  }, [data, search]);

  // Sort filtered data
  const sorted = useMemo(() => {
    if (!sort.key || !sort.direction) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleSort(colKey: string) {
    setSort((prev) => {
      if (prev.key !== colKey) return { key: colKey, direction: 'asc' };
      if (prev.direction === 'asc') return { key: colKey, direction: 'desc' };
      return { key: '', direction: null };
    });
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-3">
      {searchable && (
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className={cn(
            'w-full bg-space border border-border rounded-sm px-3 py-1.5',
            'text-text-primary font-mono text-xs placeholder:text-text-muted',
            'focus:outline-none focus:border-cyan-dim focus:ring-1 focus:ring-cyan-dim/30',
            'transition-colors',
          )}
        />
      )}

      {/* Table wrapper with sticky header */}
      <div className="overflow-auto rounded-sm border border-border">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'bg-panel text-text-secondary uppercase tracking-widest text-xs font-ui',
                    'border-b border-border px-3 py-2 text-left',
                    col.sortable && 'cursor-pointer select-none hover:text-text-primary transition-colors',
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-text-muted">
                        {sort.key === col.key && sort.direction === 'asc' ? (
                          <ChevronUp size={12} />
                        ) : sort.key === col.key && sort.direction === 'desc' ? (
                          <ChevronDown size={12} />
                        ) : (
                          <ChevronsUpDown size={12} />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-10 text-center">
                  {emptyState ?? (
                    <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
                      NO DATA
                    </span>
                  )}
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => {
                const key = rowKey ? rowKey(row, i) : String(i);
                return (
                  <tr
                    key={key}
                    className="border-b border-border-subtle hover:bg-elevated transition-colors"
                  >
                    {columns.map((col) => {
                      const value = row[col.key];
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            'px-3 py-2 text-text-primary text-sm',
                            col.numeric && 'font-mono',
                          )}
                        >
                          {col.render ? col.render(value, row) : (value != null ? String(value) : '—')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-text-muted text-xs">
            {sorted.length.toLocaleString()} rows &middot; page{' '}
            <span className="text-text-secondary">{currentPage}</span> /{' '}
            <span className="text-text-secondary">{totalPages}</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                'font-mono text-xs px-3 py-1 border border-border rounded-sm',
                'text-text-secondary hover:border-cyan-dim hover:text-text-primary transition-colors',
                'disabled:opacity-30 disabled:cursor-not-allowed',
              )}
            >
              PREV
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                'font-mono text-xs px-3 py-1 border border-border rounded-sm',
                'text-text-secondary hover:border-cyan-dim hover:text-text-primary transition-colors',
                'disabled:opacity-30 disabled:cursor-not-allowed',
              )}
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
