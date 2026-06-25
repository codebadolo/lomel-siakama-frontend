import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const navigate = useNavigate()

  return (
    <nav className="flex items-center gap-1 text-xs">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight size={11} className="text-gray-300" />}
            {isLast || !item.href ? (
              <span className="text-gray-500">{item.label}</span>
            ) : (
              <button
                onClick={() => navigate(item.href!)}
                className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
              >
                {item.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
