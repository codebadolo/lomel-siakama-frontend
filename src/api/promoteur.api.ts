import { apiClient } from './client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EcoleStats {
  id: number
  nom: string
  nb_eleves: number
  nb_classes: number
  nb_enseignants: number
  taux_remplissage: number | null
  taux_assiduite: number | null
  chiffre_affaires: number
  impayes_estime: number
}

export interface PromoteurDashboard {
  nb_ecoles: number
  total_eleves: number
  total_classes: number
  total_enseignants: number
  chiffre_affaires: number
  impayes_estime: number
  ecoles: EcoleStats[]
}

export interface EcolePromo {
  id: number
  nom: string
  adresse: string
  ville: string
  telephone: string
  email: string
  type_ecole: 'primaire' | 'secondaire' | 'mixte'
  est_active: boolean
  logo: string | null
  cree_le: string
  nb_eleves: number
  nb_enseignants: number
  abonnement: Abonnement | null
}

export interface Abonnement {
  id: number
  plan: 'mensuel' | 'trimestriel' | 'annuel'
  montant: number
  date_debut: string
  date_fin: string
  est_actif: boolean
  dernier_paiement: string | null
  notes: string
  jours_restants: number
  est_expire: boolean
  cree_le: string
}

export interface AdminEcole {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  telephone: string
  is_active: boolean
  date_joined: string
}

export interface MonitoringData {
  ecoles_inactives: EcolePromo[]
  abonnements_expirant: Abonnement[]
  abonnements_expires: Abonnement[]
  total_ecoles: number
  total_ecoles_actives: number
}

// ── API ───────────────────────────────────────────────────────────────────────

export const promoteurApi = {
  // Dashboard (endpoint existant dans /auth/)
  getDashboard: async () => {
    const { data } = await apiClient.get<PromoteurDashboard>('/auth/promoteur/dashboard/')
    return data
  },

  // Écoles
  listEcoles: async () => {
    const { data } = await apiClient.get<{ resultats: EcolePromo[] } | EcolePromo[]>('/promoteur/ecoles/', { params: { taille_page: 100 } })
    return Array.isArray(data) ? data : (data as any).resultats ?? []
  },
  createEcole: async (payload: { nom: string; ville?: string; adresse?: string; telephone?: string; email?: string; type_ecole?: string }) => {
    const { data } = await apiClient.post<EcolePromo>('/promoteur/ecoles/', payload)
    return data
  },
  activerEcole: async (id: number) => {
    await apiClient.post(`/promoteur/ecoles/${id}/activer/`)
  },
  suspendreEcole: async (id: number) => {
    await apiClient.post(`/promoteur/ecoles/${id}/suspendre/`)
  },
  deleteEcole: async (id: number) => {
    await apiClient.delete(`/promoteur/ecoles/${id}/`)
  },

  // Admins d'école
  getAdmins: async (ecoleId: number) => {
    const { data } = await apiClient.get<AdminEcole[]>(`/promoteur/ecoles/${ecoleId}/admins/`)
    return data
  },
  creerAdmin: async (ecoleId: number, payload: { first_name: string; last_name: string; email: string; password: string; telephone?: string }) => {
    const { data } = await apiClient.post<AdminEcole>(`/promoteur/ecoles/${ecoleId}/creer-admin/`, payload)
    return data
  },
  activerAdmin: async (ecoleId: number, adminId: number) => {
    await apiClient.post(`/promoteur/ecoles/${ecoleId}/admins/${adminId}/activer/`)
  },
  desactiverAdmin: async (ecoleId: number, adminId: number) => {
    await apiClient.post(`/promoteur/ecoles/${ecoleId}/admins/${adminId}/desactiver/`)
  },
  resetMdp: async (ecoleId: number, adminId: number, password: string) => {
    await apiClient.post(`/promoteur/ecoles/${ecoleId}/admins/${adminId}/reset-mdp/`, { password })
  },
  impersonner: async (ecoleId: number, adminId: number) => {
    const { data } = await apiClient.post<{ access: string; refresh: string }>(`/promoteur/ecoles/${ecoleId}/admins/${adminId}/impersonner/`)
    return data
  },

  // Abonnements
  listAbonnements: async () => {
    const { data } = await apiClient.get<{ resultats: Abonnement[] } | Abonnement[]>('/promoteur/abonnements/', { params: { taille_page: 100 } })
    return Array.isArray(data) ? data : (data as any).resultats ?? []
  },
  createAbonnement: async (payload: { ecole: number; plan: string; montant: number; date_debut: string; date_fin: string; notes?: string }) => {
    const { data } = await apiClient.post<Abonnement>('/promoteur/abonnements/', payload)
    return data
  },
  marquerPaye: async (id: number) => {
    const { data } = await apiClient.post<Abonnement>(`/promoteur/abonnements/${id}/marquer-paye/`)
    return data
  },

  // Monitoring
  getMonitoring: async () => {
    const { data } = await apiClient.get<MonitoringData>('/promoteur/monitoring/')
    return data
  },

  // Annonces
  envoyerAnnonce: async (payload: { sujet: string; message: string; ecoles?: number[] }) => {
    const { data } = await apiClient.post<{ detail: string; nb_destinataires: number }>('/promoteur/annonce/', payload)
    return data
  },
}
