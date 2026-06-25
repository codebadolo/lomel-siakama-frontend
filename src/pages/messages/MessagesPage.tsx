import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Search, MessageSquare, Megaphone, SlidersHorizontal, Users } from 'lucide-react'
import { messagesApi } from '@/api/messages.api'
import { usePermissions } from '@/hooks/usePermissions'
import { MessageList } from './components/MessageList'
import { MessageThread } from './components/MessageThread'
import { AnnoncePanel } from './components/AnnoncePanel'
import { ConversationPanel } from './components/ConversationPanel'
import { cn } from '@/lib/utils'

type Tab = 'messages' | 'annonces' | 'conversations'
type StatutFilter = '' | 'en_attente' | 'repondu' | 'clos'

export default function MessagesPage() {
  const { isAdmin, isTeacher, isPersonnel, isParent } = usePermissions()
  const canManageAnnonces = isAdmin || isTeacher
  const [searchParams] = useSearchParams()
  const convParam = searchParams.get('conv')

  const [tab, setTab] = useState<Tab>(convParam ? 'conversations' : 'messages')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    if (convParam) setTab('conversations')
  }, [convParam])
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState<StatutFilter>('')
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['messages', statut, search],
    queryFn: () => messagesApi.list({
      statut: statut || undefined,
      search: search || undefined,
    }),
  })

  const messages = data?.resultats ?? []

  const isTab = (t: Tab) => tab === t

  // Conversations tab takes full width
  if (isTab('conversations')) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex border-b border-gray-200 bg-white shrink-0">
          <TabBtn active={isTab('messages')}       icon={<MessageSquare size={14} />} label="Messages"      onClick={() => setTab('messages')} />
          <TabBtn active={isTab('annonces')}       icon={<Megaphone size={14} />}     label="Annonces"      onClick={() => setTab('annonces')} />
          {(isPersonnel || isParent) && <TabBtn active={isTab('conversations')} icon={<Users size={14} />} label="Conversations" onClick={() => setTab('conversations')} />}
        </div>
        <div className="flex-1 overflow-hidden">
          <ConversationPanel initialConvId={convParam ? Number(convParam) : undefined} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left column ── */}
      <div className="w-80 shrink-0 flex flex-col border-r border-gray-200 bg-white">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 shrink-0">
          <TabBtn active={isTab('messages')}       icon={<MessageSquare size={14} />} label="Messages"      onClick={() => setTab('messages')} />
          <TabBtn active={isTab('annonces')}       icon={<Megaphone size={14} />}     label="Annonces"      onClick={() => setTab('annonces')} />
          {isPersonnel && <TabBtn active={isTab('conversations')} icon={<Users size={14} />}         label="Conv."         onClick={() => setTab('conversations')} />}
        </div>

        {/* Search + filters (messages tab only) */}
        {tab === 'messages' && (
          <div className="px-4 py-3 space-y-2 shrink-0 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={cn(
                  'flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors',
                  showFilters ? 'border-indigo-400 text-indigo-600 bg-indigo-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                )}
              >
                <SlidersHorizontal size={11} /> Filtres
              </button>
              {showFilters && (
                <>
                  {([
                    { value: '', label: 'Tous' },
                    { value: 'en_attente', label: 'En attente' },
                    { value: 'repondu', label: 'Répondus' },
                    { value: 'clos', label: 'Clos' },
                  ] as { value: StatutFilter; label: string }[]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setStatut(opt.value)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full border transition-colors',
                        statut === opt.value
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'messages' ? (
            <MessageList
              messages={messages}
              selectedId={selectedId}
              onSelect={setSelectedId}
              loading={isLoading}
            />
          ) : (
            <div className="px-4 py-3 text-xs text-gray-500">
              Sélectionnez une annonce dans le panneau principal.
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {tab === 'messages' ? (
          selectedId ? (
            <MessageThread messageId={selectedId} />
          ) : (
            <EmptyState
              icon={<MessageSquare size={32} className="text-gray-300" />}
              title="Aucun message sélectionné"
              subtitle="Choisissez un message dans la liste pour afficher la conversation."
            />
          )
        ) : (
          <AnnoncePanel canManage={canManageAnnonces} />
        )}
      </div>
    </div>
  )
}

function TabBtn({ active, icon, label, onClick }: {
  active: boolean; icon: React.ReactNode; label: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium border-b-2 transition-colors',
        active
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      )}
    >
      {icon} {label}
    </button>
  )
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-8">
      {icon}
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  )
}
