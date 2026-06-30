import { useState, useEffect, useRef } from 'react'
import { Bell, Search, X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications.api'

const SEARCH_LINKS = [
  { label: 'Tableau de bord',  to: '/dashboard'          },
  { label: 'Élèves',           to: '/eleves'             },
  { label: 'Classes',          to: '/classes'            },
  { label: 'Matières',         to: '/matieres'           },
  { label: 'Présences',        to: '/presences'          },
  { label: 'Évaluations',      to: '/evaluations'        },
  { label: 'Bulletins',        to: '/bulletins'          },
  { label: 'Emploi du temps',  to: '/emploi-du-temps'   },
  { label: 'Discipline',       to: '/discipline'         },
  { label: 'Messages',         to: '/messages'           },
  { label: 'Annonces',         to: '/annonces'           },
  { label: 'Notifications',    to: '/notifications'      },
  { label: 'Finances',         to: '/finances'           },
  { label: 'Parents',          to: '/parents'            },
  { label: 'Utilisateurs',     to: '/utilisateurs'       },
  { label: 'Années scolaires', to: '/annees-scolaires'   },
  { label: 'Paramètres',       to: '/parametres'         },
]

function SearchModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const results = q.trim()
    ? SEARCH_LINKS.filter((l) => l.label.toLowerCase().includes(q.toLowerCase()))
    : SEARCH_LINKS

  const go = (to: string) => { navigate(to); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Aller vers…"
            className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
        <div className="py-2 max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Aucun résultat</p>
          ) : (
            results.map((r) => (
              <button
                key={r.to}
                onClick={() => go(r.to)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
              >
                <span className="flex-1">{r.label}</span>
                <kbd className="text-[10px] text-gray-400 border border-gray-200 rounded px-1">↵</kbd>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function Header() {
  const today = format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })
  const label = today.charAt(0).toUpperCase() + today.slice(1)
  const navigate = useNavigate()
  const [showSearch, setShowSearch] = useState(false)

  const { data: notifData } = useQuery({
    queryKey: ['notif-count'],
    queryFn:  notificationsApi.nonLues,
    refetchInterval: 30_000,
  })
  const nbNotif = notifData?.count ?? 0

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <header className="h-[52px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <p className="text-sm text-gray-400">{label}</p>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 text-sm text-gray-400 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-md"
          >
            <Search size={13} />
            <span>Rechercher…</span>
            <kbd className="ml-1 text-[10px] bg-white border border-gray-300 rounded px-1 py-px text-gray-400">⌘K</kbd>
          </button>

          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Notifications"
          >
            <Bell size={17} />
            {nbNotif > 0 && (
              <span className="absolute top-[6px] right-[6px] min-w-[14px] h-[14px] bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {nbNotif > 9 ? '9+' : nbNotif}
              </span>
            )}
          </button>
        </div>
      </header>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </>
  )
}
