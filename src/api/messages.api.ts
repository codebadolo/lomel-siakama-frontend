import { apiClient } from './client'
import type { PaginatedResponse } from '@/types'

export interface Message {
  id: number
  expediteur: number
  nom_expediteur: string
  ecole: number
  objet: string
  contenu: string
  statut: 'en_attente' | 'repondu' | 'clos'
  statut_label: string
  cree_le: string
  modifie_le: string
  reponses: Reponse[]
  pieces_jointes: PieceJointe[]
}

export interface MessagePreview {
  id: number
  expediteur: number
  nom_expediteur: string
  objet: string
  statut: 'en_attente' | 'repondu' | 'clos'
  statut_label: string
  cree_le: string
  nb_reponses: number
}

export interface Reponse {
  id: number
  message: number
  auteur: number
  nom_auteur: string
  contenu: string
  pieces_jointes: PieceJointe[]
  cree_le: string
}

export interface PieceJointe {
  id: number
  fichier: string
  nom_original: string
  taille: number
  cree_le: string
}

export interface Annonce {
  id: number
  titre: string
  contenu: string
  ecole: number
  auteur: number
  nom_auteur: string
  public_cible: 'tous' | 'parents' | 'enseignants'
  public_label: string
  est_active: boolean
  publie_le: string
  fichier: string | null
}

export const messagesApi = {
  list: async (params?: { statut?: string; search?: string; page?: number }) => {
    const { data } = await apiClient.get<PaginatedResponse<MessagePreview>>('/communication/messages/', { params })
    return data
  },

  get: async (id: number) => {
    const { data } = await apiClient.get<Message>(`/communication/messages/${id}/`)
    return data
  },

  reply: async (messageId: number, contenu: string) => {
    const { data } = await apiClient.post<Reponse>('/communication/reponses/', {
      message: messageId,
      contenu,
    })
    return data
  },

  close: async (id: number) => {
    const { data } = await apiClient.post(`/communication/messages/${id}/cloturer/`)
    return data
  },

  uploadAttachment: async (messageId: number, file: File) => {
    const form = new FormData()
    form.append('message', String(messageId))
    form.append('fichier', file)
    const { data } = await apiClient.post<PieceJointe>('/communication/pieces-jointes/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  // Annonces
  listAnnonces: async (params?: { public_cible?: string; est_active?: boolean }) => {
    const { data } = await apiClient.get<PaginatedResponse<Annonce>>('/communication/annonces/', { params })
    return data
  },

  createAnnonce: async (payload: FormData) => {
    const { data } = await apiClient.post<Annonce>('/communication/annonces/', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  updateAnnonce: async (id: number, payload: FormData) => {
    const { data } = await apiClient.patch<Annonce>(`/communication/annonces/${id}/`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  deleteAnnonce: async (id: number) => {
    await apiClient.delete(`/communication/annonces/${id}/`)
  },
}

// ─── Conversations ─────────────────────────────────────────────────────────────

export interface ConversationMembre {
  id: number
  utilisateur: number
  nom_complet: string
  role: string
  role_label: string
  photo_profil: string | null
  est_admin: boolean
  rejoint_le: string
}

export interface DernierMessage {
  id: number
  contenu: string
  auteur: string
  cree_le: string
}

export interface ConversationPreview {
  id: number
  type_conversation: 'direct' | 'groupe'
  type_label: string
  nom: string
  nom_affiche: string
  photo: string | null
  nb_membres: number
  dernier_message: DernierMessage | null
  cree_le: string
}

export interface Conversation {
  id: number
  ecole: number
  type_conversation: 'direct' | 'groupe'
  type_label: string
  nom: string
  nom_affiche: string
  photo: string | null
  cree_par: number | null
  cree_le: string
  membres: ConversationMembre[]
}

export interface MessageConversation {
  id: number
  conversation: number
  auteur: number | null
  nom_auteur: string
  role_auteur: string | null
  contenu: string
  type_message: 'texte' | 'audio' | 'fichier'
  type_label: string
  fichier: string | null
  cree_le: string
}

export const conversationsApi = {
  list: async () => {
    const { data } = await apiClient.get<PaginatedResponse<ConversationPreview>>('/communication/conversations/')
    return data
  },

  get: async (id: number) => {
    const { data } = await apiClient.get<Conversation>(`/communication/conversations/${id}/`)
    return data
  },

  create: async (payload: { ecole: number; type_conversation: 'direct' | 'groupe'; nom?: string; membres_ids?: number[] }) => {
    const { data } = await apiClient.post<Conversation>('/communication/conversations/', payload)
    return data
  },

  demarrerDirect: async (utilisateur_id: number) => {
    const { data } = await apiClient.post<Conversation>('/communication/conversations/demarrer_direct/', { utilisateur_id })
    return data
  },

  getMessages: async (convId: number) => {
    const { data } = await apiClient.get<MessageConversation[]>(`/communication/conversations/${convId}/messages/`)
    return data
  },

  envoyer: async (convId: number, payload: { contenu?: string; type_message?: 'texte' | 'audio' | 'fichier'; fichier?: File }) => {
    const form = new FormData()
    if (payload.contenu) form.append('contenu', payload.contenu)
    form.append('type_message', payload.type_message ?? 'texte')
    if (payload.fichier) form.append('fichier', payload.fichier)
    const { data } = await apiClient.post<MessageConversation>(
      `/communication/conversations/${convId}/envoyer/`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data
  },

  ajouterMembre: async (convId: number, utilisateur_id: number) => {
    const { data } = await apiClient.post(`/communication/conversations/${convId}/ajouter_membre/`, { utilisateur_id })
    return data
  },
}
