import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Megaphone, Users, CheckSquare,
  FileText, BookOpen, Calendar, CreditCard, AlertTriangle,
  UserCog, Settings, LogOut, School, UserRound,
  Bell, Activity,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { usePermissions } from '@/hooks/usePermissions'
import { Avatar } from '@/components/ui/Avatar'
import { notificationsApi } from '@/api/notifications.api'
import { messagesApi } from '@/api/messages.api'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  badgeQuery?: () => Promise<number>
  permission?: string
}

function NavItemRow({ item, hovered, onEnter, onLeave }: {
  item: NavItem
  hovered: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  const { can } = usePermissions()
  if (item.permission && !can(item.permission)) return null

  const { data: badgeCount } = useQuery({
    queryKey: ['sidebar-badge', item.to],
    queryFn: item.badgeQuery ?? (() => Promise.resolve(0)),
    enabled: !!item.badgeQuery,
    refetchInterval: 60_000,
  })

  const badge = item.badgeQuery ? (badgeCount ?? 0) : 0

  return (
    <NavLink
      to={item.to}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={({ isActive }) => cn(
        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300',
        isActive
          ? 'bg-primary text-white shadow-lg shadow-primary/25'
          : cn(
              'text-muted-foreground hover:bg-secondary hover:text-foreground',
              hovered ? 'translate-x-1' : '',
            ),
      )}
    >
      <item.icon size={15} />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="bg-primary text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none animate-pulse">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Communication',
    items: [
      {
        to: '/messages',
        icon: MessageSquare,
        label: 'Messages',
        badgeQuery: async () => {
          const data = await messagesApi.list({ statut: 'en_attente', page: 1 })
          return data.total ?? 0
        },
        permission: 'messages',
      },
      { to: '/annonces', icon: Megaphone, label: 'Annonces' },
      {
        to: '/notifications',
        icon: Bell,
        label: 'Notifications',
        badgeQuery: async () => {
          const data = await notificationsApi.nonLues()
          return data.count ?? 0
        },
      },
    ],
  },
  {
    label: 'Scolarité',
    items: [
      { to: '/eleves',          icon: Users,         label: 'Élèves',          permission: 'eleves'      },
      { to: '/classes',         icon: School,        label: 'Classes',         permission: 'eleves'      },
      { to: '/presences',       icon: CheckSquare,   label: 'Présences',       permission: 'presences'   },
      { to: '/evaluations',     icon: FileText,      label: 'Évaluations',     permission: 'evaluations' },
      { to: '/bulletins',       icon: BookOpen,      label: 'Bulletins',       permission: 'bulletins'   },
      { to: '/emploi-du-temps', icon: Calendar,      label: 'Emploi du temps', permission: 'timetable'   },
      { to: '/discipline',      icon: AlertTriangle, label: 'Discipline'                                 },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/finances',     icon: CreditCard, label: 'Finances',     permission: 'finances'     },
      { to: '/parents',      icon: UserRound,  label: 'Parents',      permission: 'utilisateurs' },
      { to: '/utilisateurs', icon: UserCog,    label: 'Utilisateurs', permission: 'utilisateurs' },
    ],
  },
]

const PROMOTEUR_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Gestion',
    items: [
      { to: '/promoteur/ecoles',        icon: School,    label: 'Écoles'        },
      { to: '/promoteur/abonnements',   icon: CreditCard, label: 'Abonnements'   },
      { to: '/promoteur/monitoring',    icon: Activity,  label: 'Monitoring'    },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/promoteur/annonces',      icon: Megaphone, label: 'Annonces'      },
    ],
  },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const { isPromoter } = usePermissions()
  const navigate = useNavigate()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const sections = isPromoter ? PROMOTEUR_SECTIONS : SECTIONS
  const subtitle = isPromoter ? 'Espace Promoteur' : 'Administration'

  return (
    <aside className="w-[232px] bg-card border-r border-[var(--border)] flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-4 py-[14px] border-b border-[var(--border)] flex items-center gap-2.5">
        <img src="/logo.png" alt="LumEL SGS" className="w-10 h-10 rounded-full object-cover shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground tracking-tight">LumEL SGS</p>
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-5">
        <NavLink
          to="/dashboard"
          onMouseEnter={() => setHoveredItem('/dashboard')}
          onMouseLeave={() => setHoveredItem(null)}
          className={({ isActive }) => cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300',
            isActive
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : cn('text-muted-foreground hover:bg-secondary hover:text-foreground', hoveredItem === '/dashboard' ? 'translate-x-1' : ''),
          )}
        >
          <LayoutDashboard size={15} />
          <span>Tableau de bord</span>
        </NavLink>

        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2.5 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItemRow
                  key={item.to}
                  item={item}
                  hovered={hoveredItem === item.to}
                  onEnter={() => setHoveredItem(item.to)}
                  onLeave={() => setHoveredItem(null)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border)] p-3 space-y-0.5">
        <NavLink
          to="/parametres"
          onMouseEnter={() => setHoveredItem('/parametres')}
          onMouseLeave={() => setHoveredItem(null)}
          className={({ isActive }) => cn(
            'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300',
            isActive
              ? 'bg-primary text-white shadow-lg shadow-primary/25'
              : cn('text-muted-foreground hover:bg-secondary hover:text-foreground', hoveredItem === '/parametres' ? 'translate-x-1' : ''),
          )}
        >
          <Settings size={15} />
          <span>Paramètres</span>
        </NavLink>

        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-secondary transition-all duration-300 group cursor-pointer">
          <div className="ring-2 ring-primary/20 group-hover:ring-primary/40 rounded-full transition-all duration-300 group-hover:scale-105">
            <Avatar name={user?.nom_complet ?? 'U'} src={user?.photo_profil} size="sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user?.nom_complet}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Déconnexion"
            className="p-1 text-muted-foreground hover:text-destructive transition-all duration-300 hover:scale-110 rounded"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
