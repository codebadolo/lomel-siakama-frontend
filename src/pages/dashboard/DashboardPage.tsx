import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, CheckSquare, MessageSquare, CreditCard, Building2, Bell, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { studentsApi } from '@/api/students.api'
import { messagesApi } from '@/api/messages.api'
import { notificationsApi } from '@/api/notifications.api'
import { promoteurApi } from '@/api/promoteur.api'
import { bulletinsApi } from '@/api/bulletins.api'
import { apiClient } from '@/api/client'
import { StatCard } from './components/StatCard'
import { RecentMessages } from './components/RecentMessages'
import { AlertsFeed } from './components/AlertsFeed'
import { AttendanceChart } from './components/AttendanceChart'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  if (user?.role === 'promoteur') return <PromoteurDashboard />
  return <AdminDashboard />
}

function AdminDashboard() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const { data: elevesData } = useQuery({
    queryKey: ['dashboard-eleves-count'],
    queryFn: () => studentsApi.list({ taille_page: 1 }),
  })
  const { data: tauxData } = useQuery({
    queryKey: ['dashboard-taux-assiduite'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ taux_presence: number }>('/presences/taux-assiduite/')
      return data
    },
  })
  const { data: messagesData } = useQuery({
    queryKey: ['dashboard-messages-attente'],
    queryFn: () => messagesApi.list({ statut: 'en_attente', page: 1 }),
  })
  const { data: impayesData } = useQuery({
    queryKey: ['dashboard-impayes'],
    queryFn: () => bulletinsApi.getImpayes(),
  })
  const { data: notifData } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: () => notificationsApi.list({ taille_page: 8 }),
  })

  const nbEleves     = elevesData?.total ?? '—'
  const tauxPresence = tauxData?.taux_presence !== undefined ? `${tauxData.taux_presence}%` : '—'
  const nbMessages   = messagesData?.total ?? '—'
  const nbImpayes    = impayesData?.count ?? '—'
  const notifications = notifData?.resultats ?? []

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="animate-slide-in-up">
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bonjour{user?.first_name ? `, ${user.first_name}` : ''} — vue d'ensemble de votre établissement.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Élèves actifs"        value={nbEleves}     icon={Users}        color="indigo"  delay="0ms"   />
        <StatCard title="Présences aujourd'hui" value={tauxPresence} icon={CheckSquare}  color="emerald" delay="100ms" />
        <StatCard title="Messages en attente"   value={nbMessages}   icon={MessageSquare}color="amber"   delay="200ms" />
        <StatCard title="Impayés"               value={nbImpayes}    subtitle="Frais scolaires en retard" icon={CreditCard} color="red" delay="300ms" />
      </div>

      {/* Main content: chart + messages side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <AttendanceChart />
          <RecentMessages />
        </div>

        <div className="space-y-4">
          {/* Notifications */}
          <div
            className="bg-white border border-[var(--border)] rounded-xl transition-all duration-500 hover:shadow-xl animate-slide-in-up"
            style={{ animationDelay: '500ms' }}
          >
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              </div>
              <button
                onClick={() => navigate('/notifications')}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Tout voir <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {notifications.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">Aucune notification</p>
              ) : notifications.map((n, i) => (
                <div
                  key={n.id}
                  style={{ animationDelay: `${550 + i * 60}ms` }}
                  className={`animate-slide-in-up flex items-start gap-3 px-5 py-3.5 hover:bg-secondary transition-all duration-300 ${!n.est_lue ? 'bg-indigo-50/40' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!n.est_lue ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                      {n.titre}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(n.cree_le), 'd MMM, HH:mm', { locale: fr })}
                    </p>
                  </div>
                  {!n.est_lue && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Alertes */}
          <AlertsFeed />
        </div>
      </div>
    </div>
  )
}

function PromoteurDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['promoteur-dashboard'],
    queryFn: promoteurApi.getDashboard,
  })

  const fmt = (v: number) => v.toLocaleString('fr-FR') + ' FCFA'

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="h-8 bg-gray-100 rounded w-64 animate-pulse" />
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-destructive">Erreur lors du chargement du tableau de bord.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-[1400px]">
      <div className="animate-slide-in-up">
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord promoteur</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue consolidée de toutes vos écoles</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard title="Écoles"            value={data.nb_ecoles}              icon={Building2}    color="indigo"  delay="0ms"   />
        <StatCard title="Total élèves"       value={data.total_eleves}           icon={Users}        color="emerald" delay="100ms" />
        <StatCard title="Total classes"      value={data.total_classes}          icon={CheckSquare}  color="amber"   delay="200ms" />
        <StatCard title="Enseignants"        value={data.total_enseignants}      icon={Users}        color="indigo"  delay="300ms" />
        <StatCard title="Chiffre d'affaires" value={fmt(data.chiffre_affaires)}  icon={CreditCard}   color="emerald" delay="400ms" />
        <StatCard title="Impayés estimés"    value={fmt(data.impayes_estime)}    icon={CreditCard}   color="red"     delay="500ms" />
      </div>

      <div
        className="bg-white border border-[var(--border)] rounded-xl overflow-hidden transition-all duration-500 hover:shadow-xl animate-slide-in-up"
        style={{ animationDelay: '600ms' }}
      >
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-foreground">Détail par école</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Performances et indicateurs par établissement</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-gray-50/60">
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider">École</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider">Élèves</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider">Classes</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider">Enseignants</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider">Remplissage</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider">Assiduité</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider">CA</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider">Impayés</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {data.ecoles.map((ecole) => (
              <tr key={ecole.id} className="hover:bg-secondary transition-all duration-300">
                <td className="px-5 py-3.5 font-semibold text-foreground">{ecole.nom}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{ecole.nb_eleves}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{ecole.nb_classes}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{ecole.nb_enseignants}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{ecole.taux_remplissage !== null ? `${ecole.taux_remplissage}%` : '—'}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{ecole.taux_assiduite !== null ? `${ecole.taux_assiduite}%` : '—'}</td>
                <td className="px-5 py-3.5 text-muted-foreground text-xs">{fmt(ecole.chiffre_affaires)}</td>
                <td className="px-5 py-3.5 text-xs">
                  <span className="text-red-500 font-medium">{fmt(ecole.impayes_estime)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
