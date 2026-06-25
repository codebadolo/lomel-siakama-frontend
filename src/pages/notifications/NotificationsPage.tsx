import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { X, CheckCheck } from 'lucide-react'
import { notificationsApi, type Notification } from '@/api/notifications.api'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type ColumnDef } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<Notification['type_notification'], string> = {
  absence:          '🔔',
  retard:           '⏰',
  rappel_paiement:  '💰',
  annonce:          '📣',
  reponse_message:  '💬',
  convocation:      '⚠️',
}

const TYPE_LABELS: Record<Notification['type_notification'], string> = {
  absence:         'Absence',
  retard:          'Retard',
  rappel_paiement: 'Paiement',
  annonce:         'Annonce',
  reponse_message: 'Message',
  convocation:     'Convocation',
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [typeFilter, setTypeFilter] = useState<string | number>('')
  const [lueFilter, setLueFilter] = useState<string | number>('')
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', typeFilter, lueFilter, page, pageSize],
    queryFn: () => notificationsApi.list({
      type_notification: typeFilter ? String(typeFilter) : undefined,
      est_lue:           lueFilter === 'true' ? true : lueFilter === 'false' ? false : undefined,
      page,
      taille_page:       pageSize,
    }),
  })

  const marquerLueMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.marquerLue(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-non-lues'] })
    },
  })

  const toutMarquerLuMutation = useMutation({
    mutationFn: notificationsApi.toutMarquerLu,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-non-lues'] })
    },
  })

  const columns: ColumnDef<Notification>[] = [
    {
      header: 'Type',
      accessor: 'type_notification',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span>{TYPE_ICONS[row.type_notification]}</span>
          <span className="text-xs text-gray-500">{TYPE_LABELS[row.type_notification]}</span>
        </div>
      ),
      width: '140px',
    },
    {
      header: 'Titre',
      accessor: 'titre',
      cell: (row) => (
        <span className={cn(
          'text-sm',
          !row.est_lue ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
        )}>
          {row.titre}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'cree_le',
      cell: (row) => (
        <span className="text-xs text-gray-400">
          {format(new Date(row.cree_le), 'd MMM yyyy, HH:mm', { locale: fr })}
        </span>
      ),
      width: '160px',
    },
    {
      header: 'Lu',
      accessor: 'est_lue',
      cell: (row) => (
        <Badge variant={row.est_lue ? 'success' : 'warning'}>
          {row.est_lue ? 'Lu' : 'Non lu'}
        </Badge>
      ),
      width: '80px',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      <PageHeader
        title="Notifications"
        subtitle="Toutes vos notifications"
        breadcrumb={[
          { label: 'Tableau de bord', href: '/dashboard' },
          { label: 'Notifications' },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CheckCheck size={13} />}
            onClick={() => toutMarquerLuMutation.mutate()}
            loading={toutMarquerLuMutation.isPending}
          >
            Tout marquer lu
          </Button>
        }
      />

      <DataTable
        data={data?.resultats ?? []}
        columns={columns}
        total={data?.total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
        loading={isLoading}
        filters={[
          {
            key: 'type_notification',
            label: 'Tous les types',
            options: Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })),
          },
          {
            key: 'est_lue',
            label: 'Statut lecture',
            options: [
              { value: 'false', label: 'Non lues' },
              { value: 'true',  label: 'Lues' },
            ],
          },
        ]}
        filterValues={{ type_notification: typeFilter, est_lue: lueFilter }}
        onFilterChange={(key, value) => {
          setPage(1)
          if (key === 'type_notification') setTypeFilter(value)
          else if (key === 'est_lue') setLueFilter(value)
        }}
        emptyMessage="Aucune notification"
        onRowClick={(row) => setSelectedNotif(row)}
        actions={(row) => (
          !row.est_lue ? (
            <button
              onClick={() => marquerLueMutation.mutate(row.id)}
              disabled={marquerLueMutation.isPending}
              className="text-xs px-2 py-1 rounded-md border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              Marquer lu
            </button>
          ) : null
        )}
      />

      {selectedNotif && (
        <NotifDetailModal notif={selectedNotif} onClose={() => setSelectedNotif(null)} />
      )}
    </div>
  )
}

function NotifDetailModal({ notif, onClose }: { notif: Notification; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-lg">{TYPE_ICONS[notif.type_notification]}</span>
            <h2 className="text-base font-semibold text-gray-900">{notif.titre}</h2>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">{notif.contenu}</p>
          <p className="text-xs text-gray-400">
            {format(new Date(notif.cree_le), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </p>
        </div>
        <div className="px-6 pb-5 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  )
}
