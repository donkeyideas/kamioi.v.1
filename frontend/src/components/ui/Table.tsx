import { useState, useMemo, type ReactNode } from 'react';

/* ---- Types ---- */

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  rowKey?: (row: T, index: number) => string | number;
}

type SortDirection = 'asc' | 'desc' | null;

/* ---- Styles ---- */

const tableWrapperStyle: React.CSSProperties = {
  width: '100%',
  overflowX: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: 'inherit',
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  background: 'var(--surface-row-hover)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  userSelect: 'none',
  borderBottom: '1px solid var(--border-divider)',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-divider)',
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '80px 20px',
  color: 'var(--text-muted)',
  fontSize: '14px',
};

const paginationStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  fontSize: '13px',
  color: 'var(--text-muted)',
};

const paginationBtnStyle: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 500,
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-input)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  transition: 'all 200ms ease',
};

/* ---- Component ---- */

export function Table<T>({
  columns,
  data,
  pageSize = 10,
  emptyMessage = 'No data available',
  loading = false,
  onRowClick,
  className,
  rowKey,
}: TableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  /* Sorting */
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const result =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal));

      return sortDir === 'asc' ? result : -result;
    });
  }, [data, sortKey, sortDir]);

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const end = Math.min(start + pageSize, sortedData.length);
  const pageData = sortedData.slice(start, end);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((prev) =>
        prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc',
      );
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  }

  function sortIndicator(key: string) {
    if (sortKey !== key || !sortDir) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  }

  /* Loading state */
  if (loading) {
    return (
      <div className={className} style={emptyStyle}>
        Loading...
      </div>
    );
  }

  /* Empty state */
  if (data.length === 0) {
    return (
      <div className={className} style={emptyStyle}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...thStyle,
                    width: col.width,
                    textAlign: col.align ?? 'left',
                    cursor: col.sortable ? 'pointer' : 'default',
                  }}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  {col.header}
                  {col.sortable && (
                    <span style={{ opacity: 0.5, fontSize: '10px' }}>
                      {sortIndicator(col.key)}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => {
              const globalIndex = start + i;
              return (
                <tr
                  key={rowKey ? rowKey(row, globalIndex) : globalIndex}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background 200ms ease',
                  }}
                  onClick={() => onRowClick?.(row, globalIndex)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--surface-row-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        ...tdStyle,
                        textAlign: col.align ?? 'left',
                      }}
                    >
                      {col.render
                        ? col.render(row, globalIndex)
                        : String(
                            (row as Record<string, unknown>)[col.key] ?? '',
                          )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sortedData.length > pageSize && (
        <div style={paginationStyle}>
          <span>
            Showing {start + 1}-{end} of {sortedData.length}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              style={{
                ...paginationBtnStyle,
                opacity: safePage === 0 ? 0.4 : 1,
                cursor: safePage === 0 ? 'not-allowed' : 'pointer',
              }}
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <button
              style={{
                ...paginationBtnStyle,
                opacity: safePage >= totalPages - 1 ? 0.4 : 1,
                cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer',
              }}
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
