import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type Utilisateur } from '@/api/users.api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const createSchema = z.object({
  email:               z.string().email('Email invalide'),
  first_name:          z.string().min(1, 'Prénom requis'),
  last_name:           z.string().min(1, 'Nom requis'),
  role:                z.enum(['admin', 'enseignant', 'parent', 'promoteur', 'surveillant']),
  telephone:           z.string().optional(),
  mot_de_passe:        z.string().min(8, 'Minimum 8 caractères'),
  mot_de_passe_confirm: z.string(),
}).refine((d) => d.mot_de_passe === d.mot_de_passe_confirm, {
  message: 'Les mots de passe ne correspondent pas.',
  path: ['mot_de_passe_confirm'],
})

const editSchema = z.object({
  email:      z.string().email('Email invalide'),
  first_name: z.string().min(1, 'Prénom requis'),
  last_name:  z.string().min(1, 'Nom requis'),
  telephone:  z.string().optional(),
  is_active:  z.boolean(),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues   = z.infer<typeof editSchema>

const ROLES = [
  { value: 'admin',       label: 'Administrateur' },
  { value: 'enseignant',  label: 'Enseignant' },
  { value: 'surveillant', label: 'Surveillant' },
  { value: 'parent',      label: 'Parent' },
  { value: 'promoteur',   label: 'Promoteur' },
] as const

interface Props {
  user?: Utilisateur | null
  onClose: () => void
}

export function UserFormModal({ user, onClose }: Props) {
  const qc = useQueryClient()
  const isEdit = Boolean(user)

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'enseignant' },
  })

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
  })

  useEffect(() => {
    if (user) {
      editForm.reset({
        email:      user.email,
        first_name: user.first_name,
        last_name:  user.last_name,
        telephone:  user.telephone,
        is_active:  user.is_active,
      })
    }
  }, [user, editForm])

  const onSuccess = () => {
    qc.invalidateQueries({ queryKey: ['utilisateurs'] })
    onClose()
  }

  const createMutation = useMutation({ mutationFn: usersApi.create, onSuccess })
  const editMutation   = useMutation({
    mutationFn: (values: EditValues) => usersApi.update(user!.id, values),
    onSuccess,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Modifier le compte' : 'Nouveau compte'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {isEdit ? (
          <form
            onSubmit={editForm.handleSubmit((v) => editMutation.mutate(v))}
            className="px-6 py-5 space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                {...editForm.register('first_name')}
                error={editForm.formState.errors.first_name?.message}
              />
              <Input
                label="Nom"
                {...editForm.register('last_name')}
                error={editForm.formState.errors.last_name?.message}
              />
            </div>
            <Input
              label="Email"
              type="email"
              {...editForm.register('email')}
              error={editForm.formState.errors.email?.message}
            />
            <Input
              label="Téléphone"
              {...editForm.register('telephone')}
              placeholder="+225 07 00 00 00"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...editForm.register('is_active')}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Compte actif</span>
            </label>

            <FormFooter isPending={editMutation.isPending} isError={editMutation.isError} onClose={onClose} isEdit />
          </form>
        ) : (
          <form
            onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
            className="px-6 py-5 space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                {...createForm.register('first_name')}
                error={createForm.formState.errors.first_name?.message}
              />
              <Input
                label="Nom"
                {...createForm.register('last_name')}
                error={createForm.formState.errors.last_name?.message}
              />
            </div>
            <Input
              label="Email"
              type="email"
              {...createForm.register('email')}
              error={createForm.formState.errors.email?.message}
            />
            <Input
              label="Téléphone"
              {...createForm.register('telephone')}
              placeholder="+225 07 00 00 00"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <select
                {...createForm.register('role')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <Input
                type="password"
                {...createForm.register('mot_de_passe')}
                error={createForm.formState.errors.mot_de_passe?.message}
                placeholder="Minimum 8 caractères"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
              <Input
                type="password"
                {...createForm.register('mot_de_passe_confirm')}
                error={createForm.formState.errors.mot_de_passe_confirm?.message}
              />
            </div>

            <FormFooter isPending={createMutation.isPending} isError={createMutation.isError} onClose={onClose} />
          </form>
        )}
      </div>
    </div>
  )
}

function FormFooter({ isPending, isError, onClose, isEdit }: {
  isPending: boolean
  isError: boolean
  onClose: () => void
  isEdit?: boolean
}) {
  return (
    <>
      {isError && (
        <p className="text-xs text-red-500">Une erreur s'est produite. Vérifiez les données et réessayez.</p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={isPending}>
          {isEdit ? 'Enregistrer' : 'Créer le compte'}
        </Button>
      </div>
    </>
  )
}

export function ConfirmDeactivateModal({ user, onClose, onConfirm, isPending }: {
  user: Utilisateur
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Désactiver le compte</h2>
        <p className="text-sm text-gray-600 mb-5">
          Le compte de <span className="font-medium">{user.nom_complet}</span> sera désactivé.
          L'utilisateur ne pourra plus se connecter mais ses données seront conservées.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
          <Button variant="danger" size="sm" loading={isPending} onClick={onConfirm}>
            Désactiver
          </Button>
        </div>
      </div>
    </div>
  )
}
