import { apiClient } from './client'
import type { PaginatedResponse } from '@/types'

export interface Utilisateur {
  id: number
  email: string
  first_name: string
  last_name: string
  nom_complet: string
  role: 'admin' | 'enseignant' | 'parent' | 'promoteur' | 'surveillant'
  telephone: string
  photo_profil: string | null
  ecole: number | null
  is_active: boolean
  cree_le: string
  modifie_le: string
}

export interface CreerUtilisateurPayload {
  email: string
  first_name: string
  last_name: string
  role: Utilisateur['role']
  telephone?: string
  ecole?: number | null
  mot_de_passe: string
  mot_de_passe_confirm: string
}

export interface ModifierUtilisateurPayload {
  email?: string
  first_name?: string
  last_name?: string
  telephone?: string
  ecole?: number | null
  is_active?: boolean
}

export const usersApi = {
  list: async (params?: {
    role?: string
    is_active?: boolean
    search?: string
    page?: number
  }) => {
    const { data } = await apiClient.get<PaginatedResponse<Utilisateur>>('/auth/utilisateurs/', { params })
    return data
  },

  get: async (id: number) => {
    const { data } = await apiClient.get<Utilisateur>(`/auth/utilisateurs/${id}/`)
    return data
  },

  create: async (payload: CreerUtilisateurPayload) => {
    const { data } = await apiClient.post<Utilisateur>('/auth/utilisateurs/', payload)
    return data
  },

  update: async (id: number, payload: ModifierUtilisateurPayload) => {
    const { data } = await apiClient.patch<Utilisateur>(`/auth/utilisateurs/${id}/`, payload)
    return data
  },

  deactivate: async (id: number) => {
    const { data } = await apiClient.delete<{ detail: string }>(`/auth/utilisateurs/${id}/`)
    return data
  },
}
