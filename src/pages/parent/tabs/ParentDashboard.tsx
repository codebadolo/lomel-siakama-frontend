import { useQuery } from '@tanstack/react-query'
import { Users, MessageSquare, Bell, Megaphone, TrendingUp, BookOpen, CheckSquare, AlertTriangle, CreditCard } from 'lucide-react'
import { studentsApi } from '@/api/students.api'
import { notificationsApi } from '@/api/notifications.api'
import { messagesApi } from '@/api/messages.api'
import { apiClient } from '@/api/client'
import { Avatar } from '@/components/ui/Avatar'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

type Tab = 'dashboard' | 'notes' | 'bulletins' | 'presences' | 'discipline' | 'finances'

export function ParentDashboard({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { data: enfantsData } = useQuery({ queryKey: ['parent-enfants'],    queryFn: () => studentsApi.list({ taille_page: 20 }) })
  const { data: notifData }   = useQuery({ queryKey: ['parent-notifs'],     queryFn: () => notificationsApi.list({ taille_page: 6 }) })
  const { data: messagesData }= useQuery({ queryKey: ['parent-messages'],   queryFn: () => messagesApi.list({ page: 1 }) })
  const { data: annoncesData }= useQuery({
    queryKey: ['parent-annonces'],
    queryFn: async () => {
      const { data } = await apiClient.get('/communication/annonces/', { params: { taille_page: 4 } })
      return data
    },
  })

  const enfants       = enfantsData?.resultats ?? []
  const notifications = notifData?.resultats ?? []
  const messages      = messagesData?.resultats ?? []
  const annonces      = (annoncesData as any)?.resultats ?? []
  const nbNonLues     = notifications.filter((n: any) => !n.est_lue).length

  const QUICK = [
    { tab: 'notes'      as Tab, label: 'Notes & Moyennes',  icon: TrendingUp,    color: 'bg-indigo-50 text-primary' },
    { tab: 'bulletins'  as Tab, label: 'Bulletins',          icon: BookOpen,      color: 'bg-blue-50 text-blue-600' },
    { tab: 'presences'  as Tab, label: 'Présences',          icon: CheckSquare,   color: 'bg-emerald-50 text-emerald-600' },
    { tab: 'discipline' as Tab, label: 'Discipline',         icon: AlertTriangle, color: 'bg-red-50 text-red-500' },
    { tab: 'finances'   as Tab, label: 'Finances',           icon: CreditCard,    color: 'bg-amber-50 text-amber-600' },
    { tab: 'dashboard'  as Tab, label: 'Messages',           icon: MessageSquare, color: 'bg-purple-50 text-purple-600', href: '/messages' },
  ]

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Enfants suivis', value: enfants.length,       icon: Users,        color: 'text-primary' },
          { label: 'Messages',       value: messages.length,      icon: MessageSquare,color: 'text-emerald-600' },
          { label: 'Annonces',       value: annonces.length,      icon: Megaphone,    color: 'text-amber-600' },
          { label: 'Notifications',  value: nbNonLues,            icon: Bell,         color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[var(--border)] p-4 shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <Icon size={16} className={`mt-2 ${color}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Enfants */}
        <div className="bg-white border border-[var(--border)] rounded-xl">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Users size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold">Mes enfants</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {enfants.length === 0
              ? <p className="px-4 py-6 text-sm text-muted-foreground text-center">Aucun enfant associé</p>
              : enfants.map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={`${e.prenom} ${e.nom}`} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{e.prenom} {e.nom}</p>
                    <p className="text-xs text-muted-foreground">{e.nom_classe ?? 'Sans classe'}</p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Actif</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Annonces + Notifications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-xl">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Megaphone size={14} className="text-muted-foreground" />
              <h3 className="text-sm font-semibold">Annonces de l'école</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {annonces.length === 0
                ? <p className="px-4 py-4 text-sm text-muted-foreground text-center">Aucune annonce</p>
                : annonces.map((a: any) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{a.titre}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(a.publie_le ?? a.cree_le), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.contenu}</p>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="bg-white border border-[var(--border)] rounded-xl">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Bell size={14} className="text-muted-foreground" />
              <h3 className="text-sm font-semibold">Notifications récentes</h3>
              {nbNonLues > 0 && <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">{nbNonLues}</span>}
            </div>
            <div className="divide-y divide-[var(--border)]">
              {notifications.length === 0
                ? <p className="px-4 py-4 text-sm text-muted-foreground text-center">Aucune notification</p>
                : notifications.slice(0, 4).map((n: any) => (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.est_lue ? 'bg-indigo-50/40' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${!n.est_lue ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>{n.titre}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(n.cree_le), 'd MMM, HH:mm', { locale: fr })}</p>
                    </div>
                    {!n.est_lue && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* Accès rapides */}
      <div className="bg-white border border-[var(--border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-4">Accès rapides</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK.map(({ tab, label, icon: Icon, color }) => (
            <button
              key={tab + label}
              onClick={() => onNavigate(tab)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border)] hover:border-primary/30 hover:shadow-md transition-all text-center group"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                <Icon size={16} />
              </div>
              <p className="text-xs font-semibold text-foreground">{label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
