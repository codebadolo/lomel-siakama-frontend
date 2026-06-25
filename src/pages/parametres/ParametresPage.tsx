import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Camera, Lock, User, Bell, Save, Building2, Phone, Mail, MapPin, Upload } from 'lucide-react'
import { apiClient } from '@/api/client'
import { schoolsApi } from '@/api/schools.api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

type Tab = 'profil' | 'securite' | 'ecole' | 'notifications'

interface ProfilFormData {
  first_name: string
  last_name:  string
  telephone:  string
}

interface MdpFormData {
  ancien_mot_de_passe:  string
  nouveau_mot_de_passe: string
  confirm:              string
}

interface EcoleFormData {
  nom:       string
  adresse:   string
  telephone: string
  email:     string
}

export default function ParametresPage() {
  const user    = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const { isAdmin } = usePermissions()
  const [tab, setTab]         = useState<Tab>('profil')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [logoPreview, setLogoPreview]   = useState<string | null>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const logoRef    = useRef<HTMLInputElement>(null)

  const { register: regProfil, handleSubmit: hsProfil } = useForm<ProfilFormData>({
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name:  user?.last_name  ?? '',
      telephone:  user?.telephone  ?? '',
    },
  })

  const { register: regMdp, handleSubmit: hsMdp, watch, reset: resetMdp, formState: { errors: errMdp } } = useForm<MdpFormData>()

  // ── Données école ──────────────────────────────────────────────────────────
  const { data: ecole, refetch: refetchEcole } = useQuery({
    queryKey: ['mon-ecole'],
    queryFn:  schoolsApi.getMonEcole,
    enabled:  isAdmin,
  })

  const { register: regEcole, handleSubmit: hsEcole } = useForm<EcoleFormData>({
    defaultValues: {
      nom:       ecole?.nom       ?? '',
      adresse:   ecole?.adresse   ?? '',
      telephone: ecole?.telephone ?? '',
      email:     ecole?.email     ?? '',
    },
    values: ecole ? { nom: ecole.nom, adresse: ecole.adresse, telephone: ecole.telephone, email: ecole.email } : undefined,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  const profilMutation = useMutation({
    mutationFn: async (data: ProfilFormData) => {
      const { data: updated } = await apiClient.patch('/auth/moi/', data)
      return updated
    },
    onSuccess: (updated) => setUser(updated),
  })

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('photo_profil', file)
      const { data: updated } = await apiClient.patch('/auth/moi/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return updated
    },
    onSuccess: (updated) => setUser(updated),
  })

  const mdpMutation = useMutation({
    mutationFn: async (data: MdpFormData) => {
      await apiClient.post('/auth/changer-mdp/', {
        ancien_mot_de_passe:  data.ancien_mot_de_passe,
        nouveau_mot_de_passe: data.nouveau_mot_de_passe,
      })
    },
    onSuccess: () => resetMdp(),
  })

  const ecoleMutation = useMutation({
    mutationFn: async (data: EcoleFormData) => {
      if (!ecole) return
      return schoolsApi.updateEcole(ecole.id, data)
    },
    onSuccess: () => refetchEcole(),
  })

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!ecole) return
      const form = new FormData()
      form.append('logo', file)
      return schoolsApi.updateEcole(ecole.id, form)
    },
    onSuccess: () => refetchEcole(),
  })

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    photoMutation.mutate(file)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    logoMutation.mutate(file)
  }

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrateur', enseignant: 'Enseignant',
    surveillant: 'Surveillant', parent: 'Parent', promoteur: 'Promoteur',
  }

  const tabs = [
    { key: 'profil',        label: 'Profil',     Icon: User },
    { key: 'securite',      label: 'Sécurité',   Icon: Lock },
    ...(isAdmin ? [{ key: 'ecole' as Tab, label: 'Mon École', Icon: Building2 }] : []),
    { key: 'notifications', label: 'Notifications', Icon: Bell },
  ] as { key: Tab; label: string; Icon: React.ElementType }[]

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-[760px] space-y-5">
      <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Paramètres</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Tab : Profil ── */}
      {tab === 'profil' && (
        <div className="space-y-5">
          {/* Photo */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Photo de profil</h2>
            <div className="flex items-center gap-5">
              <div className="relative">
                {photoPreview || user?.photo_profil ? (
                  <img src={photoPreview ?? user?.photo_profil ?? ''} alt="Profil"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
                ) : (
                  <Avatar name={user?.nom_complet ?? ''} className="!w-20 !h-20 text-2xl" />
                )}
                <button onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-indigo-700 transition-colors">
                  <Camera size={13} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.nom_complet}</p>
                <p className="text-xs text-gray-400">{user?.role ? ROLE_LABELS[user.role] : ''}</p>
                {photoMutation.isPending && <p className="text-xs text-indigo-500 mt-1">Envoi…</p>}
                {photoMutation.isSuccess && <p className="text-xs text-green-500 mt-1">Photo mise à jour !</p>}
              </div>
            </div>
          </div>

          {/* Infos personnelles */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Informations personnelles</h2>
            <form onSubmit={hsProfil((d) => profilMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prénom</label>
                  <Input {...regProfil('first_name', { required: true })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nom</label>
                  <Input {...regProfil('last_name', { required: true })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <Input value={user?.email ?? ''} disabled className="bg-gray-50 text-gray-400" />
                <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié ici.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                <Input type="tel" {...regProfil('telephone')} placeholder="+226 70 00 00 00" />
              </div>
              {profilMutation.isSuccess && <p className="text-xs text-green-600">Profil mis à jour.</p>}
              <div className="flex justify-end">
                <Button type="submit" leftIcon={<Save size={14} />} loading={profilMutation.isPending}>
                  Enregistrer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tab : Sécurité ── */}
      {tab === 'securite' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Changer le mot de passe</h2>
          <form onSubmit={hsMdp((d) => mdpMutation.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mot de passe actuel *</label>
              <Input type="password" {...regMdp('ancien_mot_de_passe', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nouveau mot de passe *</label>
              <Input type="password" {...regMdp('nouveau_mot_de_passe', { required: true, minLength: 8 })} />
              {errMdp.nouveau_mot_de_passe?.type === 'minLength' && (
                <p className="text-xs text-red-500 mt-1">Minimum 8 caractères</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirmer *</label>
              <Input type="password" {...regMdp('confirm', {
                required: true,
                validate: (v) => v === watch('nouveau_mot_de_passe') || 'Les mots de passe ne correspondent pas',
              })} />
              {errMdp.confirm && <p className="text-xs text-red-500 mt-1">{errMdp.confirm.message}</p>}
            </div>
            {mdpMutation.isSuccess && <p className="text-xs text-green-600">Mot de passe changé avec succès.</p>}
            {mdpMutation.isError && <p className="text-xs text-red-500">Erreur. Vérifiez votre mot de passe actuel.</p>}
            <div className="flex justify-end">
              <Button type="submit" loading={mdpMutation.isPending}>Changer le mot de passe</Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tab : Mon École ── */}
      {tab === 'ecole' && isAdmin && (
        <div className="space-y-5">
          {/* Logo */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Logo de l'établissement</h2>
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                {logoPreview || ecole?.logo ? (
                  <img src={logoPreview ?? ecole?.logo ?? ''} alt="Logo école"
                    className="w-full h-full object-contain" />
                ) : (
                  <Building2 size={28} className="text-gray-300" />
                )}
              </div>
              <div>
                <button
                  onClick={() => logoRef.current?.click()}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors"
                >
                  <Upload size={13} /> Changer le logo
                </button>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                {logoMutation.isPending && <p className="text-xs text-indigo-500 mt-2">Envoi…</p>}
                {logoMutation.isSuccess && <p className="text-xs text-green-500 mt-2">Logo mis à jour !</p>}
              </div>
            </div>
          </div>

          {/* Informations de l'école */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Informations de l'établissement</h2>
            <form onSubmit={hsEcole((d) => ecoleMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  <Building2 size={11} className="inline mr-1" />Nom de l'établissement *
                </label>
                <Input {...regEcole('nom', { required: true })} placeholder="École Primaire Jean XXIII" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  <MapPin size={11} className="inline mr-1" />Adresse
                </label>
                <textarea
                  {...regEcole('adresse')}
                  rows={2}
                  placeholder="Secteur 15, Ouagadougou, Burkina Faso"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Phone size={11} className="inline mr-1" />Téléphone
                  </label>
                  <Input type="tel" {...regEcole('telephone')} placeholder="+226 25 00 00 01" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Mail size={11} className="inline mr-1" />Email
                  </label>
                  <Input type="email" {...regEcole('email')} placeholder="contact@ecole.bf" />
                </div>
              </div>

              {/* Aperçu infos actuelles */}
              {ecole && (
                <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
                  <p className="font-medium text-gray-700 mb-1">Informations actuelles</p>
                  <p><span className="font-medium">Nom :</span> {ecole.nom}</p>
                  {ecole.adresse && <p><span className="font-medium">Adresse :</span> {ecole.adresse}</p>}
                  {ecole.telephone && <p><span className="font-medium">Tél :</span> {ecole.telephone}</p>}
                  {ecole.email && <p><span className="font-medium">Email :</span> {ecole.email}</p>}
                </div>
              )}

              {ecoleMutation.isSuccess && <p className="text-xs text-green-600">Informations mises à jour !</p>}
              {ecoleMutation.isError && <p className="text-xs text-red-500">Erreur lors de la mise à jour.</p>}
              <div className="flex justify-end">
                <Button type="submit" leftIcon={<Save size={14} />} loading={ecoleMutation.isPending}>
                  Enregistrer les modifications
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Tab : Notifications ── */}
      {tab === 'notifications' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Préférences de notifications</h2>
          {[
            { label: 'Absences des élèves' },
            { label: 'Nouveaux messages parents' },
            { label: 'Nouvelles annonces' },
            { label: 'Incidents disciplinaires' },
            { label: 'Rappels de paiement' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-700">{item.label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>
          ))}
          <p className="text-xs text-gray-400">Ces préférences seront sauvegardées prochainement.</p>
        </div>
      )}
    </div>
  )
}
