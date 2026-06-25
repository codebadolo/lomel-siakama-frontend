import { apiClient } from './client'
import type { PaginatedResponse } from '@/types'
import type { Eleve } from './students.api'

export interface AnneeScolaire {
  id: number
  libelle: string      // "2024-2025"
  date_debut: string
  date_fin: string
  est_active: boolean
  ecole: number
  cree_le: string
}

export interface Ecole {
  id: number
  nom: string
  adresse: string
  telephone: string
  email: string
  logo: string | null
  cree_le: string
}

export interface Classe {
  id: number
  nom: string
  niveau: string
  serie: string
  capacite: number
  nombre_eleves: number
  est_pleine: boolean
  ecole: number
  cree_le?: string
}

export interface ClasseStats {
  total: number
  garcons: number
  filles: number
  capacite: number
  taux_remplissage: number
}

export interface ClasseMatiere {
  id: number
  nom: string
  coefficient: string
  enseignant: string | null
  enseignant_id: number | null
  config_id: number | null
}

export interface ClasseMatiereConfig {
  id: number
  classe: number
  nom_classe: string
  matiere: number
  nom_matiere: string
  coefficient: string
  ecole: number
}

export interface CreerClassePayload {
  nom: string
  niveau?: string
  serie?: string
  capacite?: number
  ecole: number
}

export const schoolsApi = {
  getMonEcole: async (): Promise<Ecole | null> => {
    const { data } = await apiClient.get<{ resultats: Ecole[]; total: number }>('/ecoles/ecoles/')
    return data.resultats[0] ?? null
  },

  updateEcole: async (id: number, payload: FormData | Partial<Ecole>) => {
    const isForm = payload instanceof FormData
    const { data } = await apiClient.patch<Ecole>(`/ecoles/ecoles/${id}/`, payload, {
      headers: isForm ? { 'Content-Type': 'multipart/form-data' } : {},
    })
    return data
  },

  listClasses: async (params?: { ecole?: number; search?: string; page?: number }) => {
    const { data } = await apiClient.get<PaginatedResponse<Classe>>('/ecoles/classes/', { params })
    return data
  },

  getClasse: async (id: number) => {
    const { data } = await apiClient.get<Classe>(`/ecoles/classes/${id}/`)
    return data
  },

  createClasse: async (payload: CreerClassePayload) => {
    const { data } = await apiClient.post<Classe>('/ecoles/classes/', payload)
    return data
  },

  updateClasse: async (id: number, payload: Partial<CreerClassePayload>) => {
    const { data } = await apiClient.patch<Classe>(`/ecoles/classes/${id}/`, payload)
    return data
  },

  deleteClasse: async (id: number) => {
    await apiClient.delete(`/ecoles/classes/${id}/`)
  },

  getClasseEleves: async (id: number) => {
    const { data } = await apiClient.get<{ resultats: Eleve[]; total: number }>(
      `/ecoles/classes/${id}/eleves/`
    )
    return data
  },

  getClasseMatieres: async (id: number) => {
    const { data } = await apiClient.get<{ resultats: ClasseMatiere[]; total: number }>(
      `/ecoles/classes/${id}/matieres/`
    )
    return data
  },

  getClasseStats: async (id: number) => {
    const { data } = await apiClient.get<ClasseStats>(`/ecoles/classes/${id}/stats/`)
    return data
  },

  listConfigs: async (params?: { classe?: number }) => {
    const { data } = await apiClient.get<PaginatedResponse<ClasseMatiereConfig>>(
      '/ecoles/configs-matieres/', { params }
    )
    return data
  },

  createConfig: async (payload: Omit<ClasseMatiereConfig, 'id' | 'nom_classe' | 'nom_matiere'>) => {
    const { data } = await apiClient.post<ClasseMatiereConfig>('/ecoles/configs-matieres/', payload)
    return data
  },

  updateConfig: async (id: number, coefficient: string) => {
    const { data } = await apiClient.patch<ClasseMatiereConfig>(
      `/ecoles/configs-matieres/${id}/`, { coefficient }
    )
    return data
  },

  deleteConfig: async (id: number) => {
    await apiClient.delete(`/ecoles/configs-matieres/${id}/`)
  },

  // ── Années scolaires ─────────────────────────────────────────────────────
  listAnneesScolaires: async () => {
    const { data } = await apiClient.get<PaginatedResponse<AnneeScolaire>>('/ecoles/annees-scolaires/')
    return data
  },

  getAnneeActive: async (): Promise<AnneeScolaire | null> => {
    const { data } = await apiClient.get<PaginatedResponse<AnneeScolaire>>(
      '/ecoles/annees-scolaires/', { params: { est_active: true } }
    )
    return data.resultats[0] ?? null
  },

  createAnneeScolaire: async (payload: {
    libelle: string
    date_debut: string
    date_fin: string
    ecole: number
  }) => {
    const { data } = await apiClient.post<AnneeScolaire>('/ecoles/annees-scolaires/', payload)
    return data
  },

  activerAnneeScolaire: async (id: number) => {
    const { data } = await apiClient.post<{ detail: string; id: number }>(
      `/ecoles/annees-scolaires/${id}/activer/`
    )
    return data
  },

  deleteAnneeScolaire: async (id: number) => {
    await apiClient.delete(`/ecoles/annees-scolaires/${id}/`)
  },
}
