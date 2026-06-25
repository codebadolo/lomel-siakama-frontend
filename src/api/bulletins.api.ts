import { apiClient } from './client'

export interface ImpayeItem {
  eleve_id: number
  nom_eleve: string
  frais: string
  restant: number
  echeance: string
}

export interface SoldeEleve {
  eleve_id: number
  nom_eleve: string
  total_du: number
  total_paye: number
  solde: number
}

export const bulletinsApi = {
  getBulletinPdf: async (eleveId: number, trimestre: 'T1' | 'T2' | 'T3') => {
    const { data } = await apiClient.get('/evaluations/notes/bulletin_pdf/', {
      params: { eleve_id: eleveId, trimestre },
      responseType: 'blob',
    })
    return data as Blob
  },

  getImpayes: async (joursRetard?: number) => {
    const { data } = await apiClient.get<{ count: number; resultats: ImpayeItem[] }>(
      '/finances/paiements/impayes/',
      { params: joursRetard !== undefined ? { jours_retard: joursRetard } : undefined }
    )
    return data
  },

  getSoldeEleve: async (eleveId: number) => {
    const { data } = await apiClient.get<SoldeEleve>('/finances/paiements/solde-eleve/', {
      params: { eleve_id: eleveId },
    })
    return data
  },
}
