import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Plus, Send, Mic, Square, Paperclip, X, Users, MessageCircle, ChevronLeft } from 'lucide-react'
import { conversationsApi, type ConversationPreview, type MessageConversation } from '@/api/messages.api'
import { usersApi } from '@/api/users.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function ConversationPanel({ initialConvId }: { initialConvId?: number }) {
  const qc = useQueryClient()
  const [selected, setSelected]         = useState<number | null>(initialConvId ?? null)
  const [showCreate, setShowCreate]     = useState(false)
  const [showMobile, setShowMobile]     = useState(!!initialConvId)

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn:  conversationsApi.list,
    refetchInterval: 5000,
  })
  const convs: ConversationPreview[] = data?.resultats ?? []

  const selectedConv = convs.find((c) => c.id === selected)

  return (
    <div className="flex h-full">
      {/* ── Liste conversations ── */}
      <div className={cn('w-72 shrink-0 border-r border-gray-200 flex flex-col', showMobile && selected ? 'hidden md:flex' : 'flex')}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">Conversations</h3>
          <button
            onClick={() => setShowCreate(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-indigo-600 transition-colors"
            title="Nouvelle conversation"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 bg-gray-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                  <div className="h-2 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : convs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageCircle size={28} className="text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">Aucune conversation. Créez-en une.</p>
            </div>
          ) : (
            convs.map((c) => (
              <ConvItem
                key={c.id}
                conv={c}
                active={selected === c.id}
                onClick={() => { setSelected(c.id); setShowMobile(true) }}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Thread ── */}
      <div className={cn('flex-1 flex flex-col', showMobile && selected ? 'flex' : 'hidden md:flex')}>
        {selected && selectedConv ? (
          <ThreadView
            convId={selected}
            convName={selectedConv.nom_affiche}
            isGroupe={selectedConv.type_conversation === 'groupe'}
            nbMembres={selectedConv.nb_membres}
            onBack={() => { setShowMobile(false) }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-3">
            <MessageCircle size={40} className="text-gray-200" />
            <p className="text-sm">Sélectionnez une conversation</p>
          </div>
        )}
      </div>

      {/* ── Modal création ── */}
      {showCreate && (
        <CreateConvModal
          onClose={() => setShowCreate(false)}
          onSuccess={(convId) => {
            setShowCreate(false)
            setSelected(convId)
            qc.invalidateQueries({ queryKey: ['conversations'] })
          }}
        />
      )}
    </div>
  )
}

// ─── Item conversation ─────────────────────────────────────────────────────────

function ConvItem({ conv, active, onClick }: { conv: ConversationPreview; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50',
        active && 'bg-indigo-50 hover:bg-indigo-50'
      )}
    >
      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
        conv.type_conversation === 'groupe' ? 'bg-purple-500' : 'bg-indigo-500')}>
        {conv.type_conversation === 'groupe' ? <Users size={14} /> : conv.nom_affiche.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <p className={cn('text-sm font-medium truncate', active ? 'text-indigo-900' : 'text-gray-900')}>
            {conv.nom_affiche}
          </p>
          {conv.dernier_message && (
            <span className="text-[10px] text-gray-400 shrink-0">
              {format(new Date(conv.dernier_message.cree_le), 'HH:mm')}
            </span>
          )}
        </div>
        {conv.dernier_message && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            <span className="font-medium">{conv.dernier_message.auteur.split(' ')[0]}</span>: {conv.dernier_message.contenu}
          </p>
        )}
      </div>
    </button>
  )
}

// ─── Thread ────────────────────────────────────────────────────────────────────

function ThreadView({ convId, convName, isGroupe, nbMembres, onBack }: {
  convId: number; convName: string; isGroupe: boolean; nbMembres: number; onBack: () => void
}) {
  const user       = useAuthStore((s) => s.user)
  const qc         = useQueryClient()
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const mediaRef   = useRef<MediaRecorder | null>(null)
  const chunksRef  = useRef<Blob[]>([])
  const bottomRef  = useRef<HTMLDivElement>(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['conv-messages', convId],
    queryFn:  () => conversationsApi.getMessages(convId),
    refetchInterval: 3000,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMutation = useMutation({
    mutationFn: (payload: { contenu?: string; type_message?: 'texte' | 'audio'; fichier?: File }) =>
      conversationsApi.envoyer(convId, payload),
    onSuccess: () => {
      setText('')
      qc.invalidateQueries({ queryKey: ['conv-messages', convId] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const sendText = () => {
    if (!text.trim()) return
    sendMutation.mutate({ contenu: text.trim(), type_message: 'texte' })
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `vocal_${Date.now()}.webm`, { type: 'audio/webm' })
        sendMutation.mutate({ type_message: 'audio', fichier: file })
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
    } catch {
      alert('Microphone non disponible.')
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
  }

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 shrink-0 bg-white">
        <button onClick={onBack} className="md:hidden p-1 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={16} />
        </button>
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
          isGroupe ? 'bg-purple-500' : 'bg-indigo-500')}>
          {isGroupe ? <Users size={13} /> : convName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{convName}</p>
          {isGroupe && <p className="text-xs text-gray-400">{nbMembres} membre{nbMembres > 1 ? 's' : ''}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-xs text-gray-400">Aucun message. Dites bonjour !</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isMine={msg.auteur === user?.id} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
        {recording ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 text-sm text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Enregistrement en cours…
            </div>
            <button onClick={stopRecording}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
              <Square size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1 min-h-[38px] max-h-32 relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
                placeholder="Message…"
                rows={1}
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-snug"
                style={{ minHeight: 38 }}
              />
            </div>
            <button
              onClick={startRecording}
              title="Message vocal"
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              <Mic size={18} />
            </button>
            <button
              onClick={sendText}
              disabled={!text.trim() || sendMutation.isPending}
              className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Bulle message ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: MessageConversation; isMine: boolean }) {
  return (
    <div className={cn('flex gap-2', isMine ? 'flex-row-reverse' : 'flex-row')}>
      {!isMine && (
        <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold shrink-0 self-end">
          {msg.nom_auteur.charAt(0).toUpperCase()}
        </div>
      )}
      <div className={cn('max-w-[70%] space-y-0.5', isMine ? 'items-end' : 'items-start')}>
        {!isMine && (
          <p className="text-[10px] text-gray-400 px-1">
            {msg.nom_auteur} · {msg.role_auteur}
          </p>
        )}
        <div className={cn(
          'px-3 py-2 rounded-2xl text-sm',
          isMine
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
        )}>
          {msg.type_message === 'texte' && <p className="whitespace-pre-wrap">{msg.contenu}</p>}
          {msg.type_message === 'audio' && msg.fichier && (
            <audio controls src={msg.fichier} className="max-w-[220px] h-8" />
          )}
          {msg.type_message === 'fichier' && msg.fichier && (
            <a href={msg.fichier} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs underline">
              <Paperclip size={12} /> Fichier joint
            </a>
          )}
        </div>
        <p className={cn('text-[10px] px-1', isMine ? 'text-right text-indigo-200' : 'text-gray-400')}>
          {format(new Date(msg.cree_le), 'HH:mm', { locale: fr })}
        </p>
      </div>
    </div>
  )
}

// ─── Modal création conversation ───────────────────────────────────────────────

function CreateConvModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (id: number) => void }) {
  const user = useAuthStore((s) => s.user)
  const [type, setType]             = useState<'direct' | 'groupe'>('direct')
  const [nomGroupe, setNomGroupe]   = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [search, setSearch]         = useState('')

  const { data: usersData } = useQuery({
    queryKey: ['utilisateurs-ecole'],
    queryFn:  () => usersApi.list({ is_active: true }),
  })
  const utilisateurs = (usersData?.resultats ?? []).filter((u) => u.id !== user?.id)
  const filtered     = utilisateurs.filter((u) =>
    u.nom_complet.toLowerCase().includes(search.toLowerCase())
  )

  const directMutation = useMutation({
    mutationFn: (uid: number) => conversationsApi.demarrerDirect(uid),
    onSuccess: (conv) => onSuccess(conv.id),
  })

  const groupeMutation = useMutation({
    mutationFn: () => conversationsApi.create({
      ecole:             user?.ecole ?? 0,
      type_conversation: 'groupe',
      nom:               nomGroupe,
      membres_ids:       selectedIds,
    }),
    onSuccess: (conv) => onSuccess(conv.id),
  })

  const toggle = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const handleSubmit = () => {
    if (type === 'direct') {
      if (selectedIds.length !== 1) return
      directMutation.mutate(selectedIds[0])
    } else {
      if (!nomGroupe.trim() || selectedIds.length === 0) return
      groupeMutation.mutate()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Nouvelle conversation</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            {(['direct', 'groupe'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); setSelectedIds([]) }}
                className={cn(
                  'flex-1 py-2 text-sm rounded-lg border font-medium transition-colors',
                  type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {t === 'direct' ? 'Direct' : 'Groupe'}
              </button>
            ))}
          </div>

          {type === 'groupe' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nom du groupe *</label>
              <input
                value={nomGroupe}
                onChange={(e) => setNomGroupe(e.target.value)}
                placeholder="Ex: Equipe enseignants 6ème…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {type === 'direct' ? 'Avec qui ?' : `Membres (${selectedIds.length} sélectionné${selectedIds.length > 1 ? 's' : ''})`}
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
              {filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    if (type === 'direct') setSelectedIds([u.id])
                    else toggle(u.id)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedIds.includes(u.id) ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {u.nom_complet.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-medium truncate">{u.nom_complet}</p>
                    <p className="text-[11px] text-gray-400">{u.role}</p>
                  </div>
                  {selectedIds.includes(u.id) && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Annuler</Button>
            <Button
              onClick={handleSubmit}
              loading={directMutation.isPending || groupeMutation.isPending}
              disabled={type === 'direct' ? selectedIds.length !== 1 : !nomGroupe.trim() || selectedIds.length === 0}
            >
              {type === 'direct' ? 'Démarrer' : 'Créer le groupe'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
