import { useState, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SelectFilter } from './SelectFilter'

export interface ColumnDef<T> {
  header: string
  accessor?: keyof T | string
  cell?: (row: T) => ReactNode
  width?: string
  sortable?: boolean
}

export interface FilterDef {
  key: string
  label: string
  options: { value: string | number; label: string }[]
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  total?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
  loading?: boolean
  searchable?: boolean
  searchValue?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  filters?: FilterDef[]
  filterValues?: Record<string, string | number>
  onFilterChange?: (key: string, value: string | number | '') => void
  emptyMessage?: string
  onRowClick?: (row: T) => void
  actions?: (row: T) => ReactNode
}

type SortDir = 'asc' | 'desc' | null

export function DataTable<T extends object>({
  data,
  columns,
  total = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  loading = false,
  searchable = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  filters,
  filterValues = {},
  onFilterChange,
  emptyMessage = 'Aucune donnée disponible',
  onRowClick,
  actions,
}: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 1

  function handleSort(col: string) {
    if (sortCol !== col) {
      setSortCol(col)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortCol(null)
      setSortDir(null)
    }
  }

  const hasToolbar = searchable || (filters && filters.length > 0)
  const hasPagination = onPageChange || onPageSizeChange

  return (
    <div className="space-y-3">
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md w-56 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
              />
            </div>
          )}
          {filters?.map((f) => (
            <SelectFilter
              key={f.key}
              value={filterValues[f.key] ?? ''}
              onChange={(v) => onFilterChange?.(f.key, v)}
              options={f.options}
              placeholder={f.label}
            />
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col, colIdx) => {
                const key = (col.accessor as string) ?? col.header
                const isActive = sortCol === key
                return (
                  <th
                    key={key ?? colIdx}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      'text-left text-xs font-medium text-gray-500 px-4 py-3 select-none',
                      col.sortable && 'cursor-pointer hover:text-gray-700'
                    )}
                    onClick={() => col.sortable && handleSort(key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        <span className="text-gray-300">
                          {isActive && sortDir === 'asc' ? (
                            <ChevronUp size={13} className="text-indigo-500" />
                          ) : isActive && sortDir === 'desc' ? (
                            <ChevronDown size={13} className="text-indigo-500" />
                          ) : (
                            <ChevronsUpDown size={13} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
              {actions && <th className="px-4 py-3 w-24" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col, ci) => (
                    <td key={(col.accessor as string) ?? ci} className="px-4 py-3.5">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3.5"><div className="h-3 bg-gray-100 rounded w-16" /></td>}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-16 text-center text-sm text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col, ci) => (
                    <td key={(col.accessor as string) ?? ci} className="px-4 py-3.5 text-gray-700">
                      {col.cell
                        ? col.cell(row)
                        : col.accessor ? (row[col.accessor as keyof T] as ReactNode) ?? '—' : '—'}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasPagination && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>Lignes par page :</span>
            <SelectFilter
              value={pageSize}
              onChange={(v) => onPageSizeChange?.(Number(v))}
              options={[
                { value: 10, label: '10' },
                { value: 20, label: '20' },
                { value: 50, label: '50' },
              ]}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs">
              Page {page} / {totalPages || 1}
              {total > 0 && ` — ${total} résultat${total > 1 ? 's' : ''}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange?.(page - 1)}
                disabled={page <= 1}
                className="p-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => onPageChange?.(page + 1)}
                disabled={page >= totalPages}
                className="p-1 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
