import { useAuthStore } from '@/store/auth.store'
import type { Role } from '@/types'

const PERMISSIONS: Record<Role, string[]> = {
  admin:       ['*'],
  enseignant:  ['dashboard', 'messages', 'eleves', 'presences', 'evaluations', 'bulletins', 'timetable', 'discipline', 'conversations'],
  surveillant: ['dashboard', 'discipline', 'eleves', 'presences', 'messages', 'conversations'],
  promoteur:   ['dashboard', 'eleves', 'bulletins', 'finances'],
  parent:      [],
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user)

  const can = (permission: string): boolean => {
    if (!user) return false
    const perms = PERMISSIONS[user.role] ?? []
    return perms.includes('*') || perms.includes(permission)
  }

  const isPersonnel = user?.role === 'admin' || user?.role === 'enseignant' || user?.role === 'surveillant'

  return {
    can,
    isAdmin:       user?.role === 'admin',
    isTeacher:     user?.role === 'enseignant',
    isPromoter:    user?.role === 'promoteur',
    isSurveillant: user?.role === 'surveillant',
    isParent:      user?.role === 'parent',
    isPersonnel,
    canConvoquer:  user?.role === 'admin' || user?.role === 'surveillant',
    role:          user?.role,
  }
}
