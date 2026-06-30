import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Megaphone, Users, CheckSquare,
  FileText, BookOpen, Calendar, CreditCard, AlertTriangle,
  UserCog, Settings, LogOut, School, UserRound,
  Bell, Activity, ChevronDown, BookMarked, GraduationCap,
  BarChart3, Receipt, Wallet, TrendingDown, PanelLeftClose, PanelLeftOpen,
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

// Finance accordion sub-items
const FINANCE_ITEMS = [
  { to: '/finances?section=dashboard', icon: BarChart3,    label: 'Tableau de bord', section: 'dashboard' },
  { to: '/finances?section=frais',     icon: Receipt,      label: 'Frais & Tranches', section: 'frais'     },
  { to: '/finances?section=paiements', icon: Wallet,       label: 'Paiements',        section: 'paiements' },
  { to: '/finances?section=impayes',   icon: TrendingDown, label: 'Impayés',          section: 'impayes'   },
] as const

function FinanceAccordion({ hoveredItem, setHoveredItem }: {
  hoveredItem: string | null
  setHoveredItem: (v: string | null) => void
}) {
  const location = useLocation()
  const isActive = location.pathname === '/finances'
  const [open, setOpen] = useState(isActive)
  const section = new URLSearchParams(location.search).get('section')

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300',
          isActive
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )}
      >
        <CreditCard size={15} />
        <span className="flex-1 text-left">Finances</span>
        <ChevronDown size={13} className={cn('transition-transform duration-200', open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div className="ml-3 mt-0.5 pl-3 border-l border-[var(--border)] space-y-0.5">
          {FINANCE_ITEMS.map((item) => {
            const active = isActive && (section === item.section || (!section && item.section === 'dashboard'))
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={() => setHoveredItem(item.to)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : cn('text-muted-foreground hover:bg-secondary hover:text-foreground',
                        hoveredItem === item.to ? 'translate-x-0.5' : ''),
                )}
              >
                <item.icon size={12} />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
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
      { to: '/annonces',      icon: Megaphone, label: 'Annonces'      },
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
      { to: '/matieres',        icon: BookMarked,    label: 'Matières',        permission: 'eleves'      },
      { to: '/presences',       icon: CheckSquare,   label: 'Présences',       permission: 'presences'   },
      { to: '/evaluations',     icon: FileText,      label: 'Évaluations',     permission: 'evaluations' },
      { to: '/bulletins',       icon: BookOpen,      label: 'Bulletins',       permission: 'bulletins'   },
      { to: '/emploi-du-temps', icon: Calendar,      label: 'Emploi du temps', permission: 'timetable'   },
      { to: '/discipline',      icon: AlertTriangle, label: 'Discipline'                                 },
    ],
  },
]

const ADMIN_ITEMS: NavItem[] = [
  { to: '/parents',           icon: UserRound,      label: 'Parents',           permission: 'utilisateurs' },
  { to: '/utilisateurs',      icon: UserCog,        label: 'Utilisateurs',      permission: 'utilisateurs' },
  { to: '/annees-scolaires',  icon: GraduationCap,  label: 'Années scolaires',  permission: 'utilisateurs' },
]

const PROMOTEUR_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Gestion',
    items: [
      { to: '/promoteur/ecoles',      icon: School,    label: 'Écoles'      },
      { to: '/promoteur/abonnements', icon: CreditCard, label: 'Abonnements' },
      { to: '/promoteur/monitoring',  icon: Activity,  label: 'Monitoring'  },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/promoteur/annonces', icon: Megaphone, label: 'Annonces' },
    ],
  },
]

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, logout } = useAuthStore()
  const { isPromoter }   = usePermissions()
  const navigate = useNavigate()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const sections = isPromoter ? PROMOTEUR_SECTIONS : SECTIONS
  const subtitle = isPromoter ? 'Espace Promoteur' : 'Administration'

  if (collapsed) {
    return (
      <aside className="w-[52px] bg-card border-r border-[var(--border)] flex flex-col shrink-0 transition-all duration-300">
        <div className="px-3 py-[14px] border-b border-[var(--border)] flex justify-center">
          <img src="/logo.png" alt="LumEL" className="w-7 h-7 rounded-full object-cover" />
        </div>
        <nav className="flex-1 overflow-y-auto no-scrollbar px-1.5 py-4 space-y-1 flex flex-col items-center">
          <NavLink to="/dashboard" title="Tableau de bord" className={({ isActive }) => cn(
            'p-2 rounded-lg transition-all', isActive ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary'
          )}>
            <LayoutDashboard size={15} />
          </NavLink>
          {[...SECTIONS, ...PROMOTEUR_SECTIONS].flatMap(s => s.items).map((item) => (
            <NavLink key={item.to} to={item.to} title={item.label} className={({ isActive }) => cn(
              'p-2 rounded-lg transition-all', isActive ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-secondary'
            )}>
              <item.icon size={15} />
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[var(--border)] p-2 flex justify-center">
          <button onClick={onToggle} className="p-2 text-muted-foreground hover:bg-secondary rounded-lg" title="Agrandir">
            <PanelLeftOpen size={15} />
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-[232px] bg-card border-r border-[var(--border)] flex flex-col shrink-0 transition-all duration-300">
      {/* Brand */}
      <div className="px-4 py-[14px] border-b border-[var(--border)] flex items-center gap-2.5">
        <img src="/logo.png" alt="LumEL SGS" className="w-10 h-10 rounded-full object-cover shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground tracking-tight">LumEL SGS</p>
          <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
        </div>
        <button onClick={onToggle} className="p-1.5 text-muted-foreground hover:bg-secondary rounded-lg shrink-0" title="Réduire">
          <PanelLeftClose size={14} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-5">
        {/* Dashboard */}
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

        {/* Finance accordion (admin only) */}
        {!isPromoter && (
          <div>
            <p className="px-2.5 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Finance
            </p>
            <FinanceAccordion hoveredItem={hoveredItem} setHoveredItem={setHoveredItem} />
          </div>
        )}

        {/* Administration */}
        {!isPromoter && (
          <div>
            <p className="px-2.5 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Administration
            </p>
            <div className="space-y-0.5">
              {ADMIN_ITEMS.map((item) => (
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
        )}
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
