import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Paperclip } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { messagesApi, type Annonce } from '@/api/messages.api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

const schema = z.object({
  titre:        z.string().min(1, 'Titre requis'),
  contenu:      z.string().min(1, 'Contenu requis'),
  public_cible: z.enum(['tous', 'parents', 'enseignants']),
  categorie:    z.enum(['general', 'recrutement', 'para_scolaire']),
  est_active:   z.boolean(),
})
type FormValues = z.infer<typeof schema>

const PUBLIC_OPTIONS = [
  { value: 'tous',        label: 'Tout le monde' },
  { value: 'parents',     label: 'Parents' },
  { value: 'enseignants', label: 'Enseignants' },
] as const

const CATEGORIE_OPTIONS = [
  { value: 'general',       label: 'Général' },
  { value: 'recrutement',   label: 'Test / Recrutement' },
  { value: 'para_scolaire', label: 'Activité para-scolaire' },
] as const

interface Props {
  annonce?: Annonce | null
  onClose: () => void
}

export function AnnonceFormModal({ annonce, onClose }: Props) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const selectedFileRef = useRef<File | null>(null)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      titre:        '',
      contenu:      '',
      public_cible: 'tous',
      categorie:    'general',
      est_active:   true,
    },
  })

  useEffect(() => {
    if (annonce) {
      reset({
        titre:        annonce.titre,
        contenu:      annonce.contenu,
        public_cible: annonce.public_cible,
        categorie:    annonce.categorie ?? 'general',
        est_active:   annonce.est_active,
      })
    }
  }, [annonce, reset])

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const form = new FormData()
      form.append('titre',        values.titre)
      form.append('contenu',      values.contenu)
      form.append('public_cible', values.public_cible)
      form.append('categorie',    values.categorie)
      form.append('est_active',   String(values.est_active))
      if (selectedFileRef.current) {
        form.append('fichier', selectedFileRef.current)
      }
      return annonce
        ? messagesApi.updateAnnonce(annonce.id, form)
        : messagesApi.createAnnonce(form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annonces'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {annonce ? "Modifier l'annonce" : 'Nouvelle annonce'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Titre</label>
            <Input {...register('titre')} placeholder="Titre de l'annonce" error={errors.titre?.message} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contenu</label>
            <textarea
              {...register('contenu')}
              rows={4}
              placeholder="Rédigez votre annonce…"
              className={cn(
                'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none',
                'placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500',
                errors.contenu && 'border-red-400'
              )}
            />
            {errors.contenu && <p className="text-xs text-red-500 mt-0.5">{errors.contenu.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Public cible</label>
              <select
                {...register('public_cible')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                {PUBLIC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                {...register('categorie')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                {CATEGORIE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('est_active')} className="rounded border-gray-300 text-primary focus:ring-primary/40" />
              <span className="text-sm text-gray-700">Publier immédiatement</span>
            </label>
          </div>

          {/* Fichier joint */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fichier joint (optionnel)</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-700 border border-dashed border-indigo-300 rounded-lg px-3 py-2 w-full justify-center hover:bg-indigo-50 transition-colors"
            >
              <Paperclip size={13} />
              {selectedFileRef.current ? selectedFileRef.current.name : 'Choisir un fichier'}
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => {
                selectedFileRef.current = e.target.files?.[0] ?? null
                e.target.value = ''
              }}
            />
            {annonce?.fichier && !selectedFileRef.current && (
              <p className="text-[11px] text-gray-400 mt-1">Fichier actuel : {annonce.fichier.split('/').pop()}</p>
            )}
          </div>

          {saveMutation.isError && (
            <p className="text-xs text-red-500">Une erreur s'est produite. Réessayez.</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" size="sm" loading={saveMutation.isPending}>
              {annonce ? 'Enregistrer' : 'Publier'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
