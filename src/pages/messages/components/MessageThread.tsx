import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Send, Paperclip, X, Lock, FileText, Image } from 'lucide-react'
import { messagesApi } from '@/api/messages.api'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const STATUT_BADGE: Record<string, 'warning' | 'success' | 'neutral'> = {
  en_attente: 'warning',
  repondu:    'success',
  clos:       'neutral',
}

function isImage(filename: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename)
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

interface Props {
  messageId: number
}

export function MessageThread({ messageId }: Props) {
  const qc = useQueryClient()
  const [reply, setReply] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: message, isLoading } = useQuery({
    queryKey: ['message', messageId],
    queryFn: () => messagesApi.get(messageId),
  })

  const replyMutation = useMutation({
    mutationFn: async () => {
      const rep = await messagesApi.reply(messageId, reply)
      for (const file of files) {
        await messagesApi.uploadAttachment(messageId, file)
      }
      return rep
    },
    onSuccess: () => {
      setReply('')
      setFiles([])
      qc.invalidateQueries({ queryKey: ['message', messageId] })
      qc.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const closeMutation = useMutation({
    mutationFn: () => messagesApi.close(messageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['message', messageId] })
      qc.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [message?.reponses.length])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!message) return null

  const isClosed = message.statut === 'clos'

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={message.nom_expediteur} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{message.nom_expediteur}</p>
            <p className="text-xs text-gray-500 truncate">{message.objet}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={STATUT_BADGE[message.statut]}>{message.statut_label}</Badge>
          {!isClosed && (
            <Button
              variant="secondary"
              size="sm"
              loading={closeMutation.isPending}
              leftIcon={<Lock size={12} />}
              onClick={() => closeMutation.mutate()}
            >
              Clôturer
            </Button>
          )}
        </div>
      </div>

      {/* ── Fil ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Message original */}
        <div className="flex gap-3">
          <Avatar name={message.nom_expediteur} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="bg-gray-100 rounded-lg rounded-tl-none px-4 py-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.contenu}</p>
            </div>
            {message.pieces_jointes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {message.pieces_jointes.map((pj) => (
                  <AttachmentItem key={pj.id} pj={pj} />
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              {format(new Date(message.cree_le), 'd MMM yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        </div>

        {/* Réponses */}
        {message.reponses.map((rep) => (
          <div key={rep.id} className="flex gap-3 flex-row-reverse">
            <Avatar name={rep.nom_auteur} size="sm" />
            <div className="flex-1 min-w-0 flex flex-col items-end">
              <div className="bg-indigo-600 rounded-lg rounded-tr-none px-4 py-3 max-w-[80%]">
                <p className="text-sm text-white whitespace-pre-wrap">{rep.contenu}</p>
              </div>
              {rep.pieces_jointes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 justify-end">
                  {rep.pieces_jointes.map((pj) => (
                    <AttachmentItem key={pj.id} pj={pj} inverted />
                  ))}
                </div>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                {rep.nom_auteur} · {format(new Date(rep.cree_le), 'd MMM à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Zone de réponse ── */}
      {isClosed ? (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-2 bg-gray-50 shrink-0">
          <Lock size={14} className="text-gray-400" />
          <p className="text-xs text-gray-400">Ce message est clôturé — aucune réponse possible.</p>
        </div>
      ) : (
        <div className="border-t border-gray-200 px-6 py-4 shrink-0">
          {/* Fichiers en attente */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-md">
                  {isImage(f.name) ? <Image size={11} /> : <FileText size={11} />}
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                    <X size={11} className="hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Écrire une réponse…"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && reply.trim()) {
                  replyMutation.mutate()
                }
              }}
              className={cn(
                'flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2.5 text-sm',
                'placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500'
              )}
            />
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => fileRef.current?.click()}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Joindre un fichier"
              >
                <Paperclip size={17} />
              </button>
              <Button
                size="sm"
                disabled={!reply.trim()}
                loading={replyMutation.isPending}
                onClick={() => replyMutation.mutate()}
                className="px-2.5"
                title="Envoyer (Ctrl+Entrée)"
              >
                <Send size={14} />
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Ctrl+Entrée pour envoyer</p>

          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? [])
              setFiles((prev) => [...prev, ...picked])
              e.target.value = ''
            }}
          />
        </div>
      )}
    </div>
  )
}

function AttachmentItem({ pj, inverted }: { pj: import('@/api/messages.api').PieceJointe; inverted?: boolean }) {
  const img = isImage(pj.nom_original)
  if (img) {
    return (
      <a href={pj.fichier} target="_blank" rel="noreferrer">
        <img src={pj.fichier} alt={pj.nom_original} className="h-24 w-auto rounded-lg object-cover border border-gray-200 hover:opacity-90 transition-opacity" />
      </a>
    )
  }
  return (
    <a
      href={pj.fichier}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors hover:opacity-80',
        inverted ? 'bg-indigo-700 border-indigo-500 text-white' : 'bg-white border-gray-200 text-gray-700'
      )}
    >
      <FileText size={13} />
      <span className="max-w-[140px] truncate">{pj.nom_original}</span>
      <span className="opacity-60">{formatSize(pj.taille)}</span>
    </a>
  )
}
