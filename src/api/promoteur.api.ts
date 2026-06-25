import { apiClient } from './client'

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

export const promoteurApi = {
  getDashboard: async () => {
    const { data } = await apiClient.get<PromoteurDashboard>('/auth/promoteur/dashboard/')
    return data
  },
}
