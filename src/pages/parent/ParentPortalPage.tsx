import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, CheckSquare,
  GraduationCap, LogOut,
  TrendingUp, AlertTriangle, CreditCard,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { ParentDashboard }    from './tabs/ParentDashboard'
import { ParentNotes }        from './tabs/ParentNotes'
import { ParentBulletins }    from './tabs/ParentBulletins'
import { ParentPresences }    from './tabs/ParentPresences'
import { ParentDiscipline }   from './tabs/ParentDiscipline'
import { ParentFinances }     from './tabs/ParentFinances'

type Tab = 'dashboard' | 'notes' | 'bulletins' | 'presences' | 'discipline' | 'finances'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard',  label: 'Accueil',      icon: GraduationCap },
  { key: 'notes',      label: 'Notes',         icon: TrendingUp },
  { key: 'bulletins',  label: 'Bulletins',     icon: BookOpen },
  { key: 'presences',  label: 'Présences',     icon: CheckSquare },
  { key: 'discipline', label: 'Discipline',    icon: AlertTriangle },
  { key: 'finances',   label: 'Finances',      icon: CreditCard },
]

export function ParentPortalPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('dashboard')

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <p className="text-sm font-bold text-foreground">SGS — Espace Parent</p>
        </div>
        <div className="flex items-center gap-3">
          <Avatar name={user?.nom_complet ?? 'P'} src={user?.photo_profil} size="sm" />
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-foreground">{user?.nom_complet}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-destructive rounded-lg hover:bg-secondary transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="bg-white border-b border-[var(--border)] overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {tab === 'dashboard'  && <ParentDashboard onNavigate={setTab} />}
        {tab === 'notes'      && <ParentNotes />}
        {tab === 'bulletins'  && <ParentBulletins />}
        {tab === 'presences'  && <ParentPresences />}
        {tab === 'discipline' && <ParentDiscipline />}
        {tab === 'finances'   && <ParentFinances />}
      </main>
    </div>
  )
}
