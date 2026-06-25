import { apiClient } from './client'
import type { PaginatedResponse } from '@/types'

export interface FraisScolaire {
  id: number
  libelle: string
  montant: string
  date_echeance: string
  ecole: number
  classes: number[]
  montant_collecte: number
  cree_le: string
}

export interface Paiement {
  id: number
  eleve: number
  nom_eleve: string
  frais: number
  libelle_frais: string
  montant_paye: string
  date_paiement: string
  mode_paiement: 'especes' | 'mobile_money' | 'virement'
  mode_label: string
  numero_recu: string
}

export const financesApi = {
  listFrais: async () => {
    const { data } = await apiClient.get<PaginatedResponse<FraisScolaire>>('/finances/frais/')
    return data
  },

  createFrais: async (payload: {
    libelle: string
    montant: string
    date_echeance: string
    ecole: number
    classes?: number[]
  }) => {
    const { data } = await apiClient.post<FraisScolaire>('/finances/frais/', payload)
    return data
  },

  deleteFrais: async (id: number) => {
    await apiClient.delete(`/finances/frais/${id}/`)
  },

  listPaiements: async (params?: { eleve?: number; frais?: number; page?: number }) => {
    const { data } = await apiClient.get<PaginatedResponse<Paiement>>('/finances/paiements/', { params })
    return data
  },

  createPaiement: async (payload: {
    eleve: number
    frais: number
    montant_paye: string
    date_paiement: string
    mode_paiement: string
    numero_recu?: string
  }) => {
    const { data } = await apiClient.post<Paiement>('/finances/paiements/', payload)
    return data
  },

  soldeEleve: async (eleveId: number) => {
    const { data } = await apiClient.get<{ details: Array<{ frais_id: number; libelle: string; montant: number; paye: number; solde: number }> }>(
      `/finances/paiements/solde-eleve/?eleve_id=${eleveId}`
    )
    return data
  },
}
