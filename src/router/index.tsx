import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { ParentPortalPage } from '@/pages/parent/ParentPortalPage'

const MessagesPage       = lazy(() => import('@/pages/messages/MessagesPage'))
const UtilisateursPage   = lazy(() => import('@/pages/utilisateurs/UtilisateursPage'))
const PromoEcolesPage    = lazy(() => import('@/pages/promoteur/PromoteurEcolesPage'))
const PromoAbosPage      = lazy(() => import('@/pages/promoteur/PromoteurAbonnementsPage'))
const PromoMonitorPage   = lazy(() => import('@/pages/promoteur/PromoteurMonitoringPage'))
const PromoAnnoncesPage  = lazy(() => import('@/pages/promoteur/PromoteurAnnoncesPage'))
const ElevesPage         = lazy(() => import('@/pages/eleves/ElevesPage'))
const EleveDetailPage    = lazy(() => import('@/pages/eleves/EleveDetailPage'))
const ClassesPage        = lazy(() => import('@/pages/classes/ClassesPage'))
const ParentsPage        = lazy(() => import('@/pages/parents/ParentsPage'))
const PresencesPage      = lazy(() => import('@/pages/presences/PresencesPage'))
const EvaluationsPage    = lazy(() => import('@/pages/evaluations/EvaluationsPage'))
const FinancesPage       = lazy(() => import('@/pages/finances/FinancesPage'))
const DisciplinePage     = lazy(() => import('@/pages/discipline/DisciplinePage'))
const BulletinsPage      = lazy(() => import('@/pages/bulletins/BulletinsPage'))
const NotificationsPage  = lazy(() => import('@/pages/notifications/NotificationsPage'))
const AnnoncesPage       = lazy(() => import('@/pages/annonces/AnnoncesPage'))
const EmploiDuTempsPage  = lazy(() => import('@/pages/emploi/EmploiDuTempsPage'))
const ParametresPage     = lazy(() => import('@/pages/parametres/ParametresPage'))

const Suspensed = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
    {children}
  </Suspense>
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },

    {
      element: <ProtectedRoute allowedRoles={['parent']} />,
      children: [
        { path: 'parent', element: <ParentPortalPage /> },
        { index: true,    element: <Navigate to="/parent" replace /> },
        { path: '*',      element: <Navigate to="/parent" replace /> },
      ],
    },

    {
      element: <ProtectedRoute allowedRoles={['admin', 'enseignant', 'promoteur', 'surveillant']} />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { index: true,             element: <Navigate to="/dashboard" replace /> },
            { path: 'dashboard',       element: <DashboardPage /> },
            { path: 'messages',        element: <Suspensed><MessagesPage /></Suspensed> },
            { path: 'annonces',        element: <Suspensed><AnnoncesPage /></Suspensed> },
            { path: 'eleves',          element: <Suspensed><ElevesPage /></Suspensed> },
            { path: 'eleves/:id',      element: <Suspensed><EleveDetailPage /></Suspensed> },
            { path: 'classes',         element: <Suspensed><ClassesPage /></Suspensed> },
            { path: 'presences',       element: <Suspensed><PresencesPage /></Suspensed> },
            { path: 'evaluations',     element: <Suspensed><EvaluationsPage /></Suspensed> },
            { path: 'bulletins',       element: <Suspensed><BulletinsPage /></Suspensed> },
            { path: 'emploi-du-temps', element: <Suspensed><EmploiDuTempsPage /></Suspensed> },
            { path: 'finances',        element: <Suspensed><FinancesPage /></Suspensed> },
            { path: 'discipline',      element: <Suspensed><DisciplinePage /></Suspensed> },
            { path: 'notifications',          element: <Suspensed><NotificationsPage /></Suspensed> },
            { path: 'parametres',             element: <Suspensed><ParametresPage /></Suspensed> },
            // Routes promoteur
            { path: 'promoteur/ecoles',       element: <Suspensed><PromoEcolesPage /></Suspensed> },
            { path: 'promoteur/abonnements',  element: <Suspensed><PromoAbosPage /></Suspensed> },
            { path: 'promoteur/monitoring',   element: <Suspensed><PromoMonitorPage /></Suspensed> },
            { path: 'promoteur/annonces',     element: <Suspensed><PromoAnnoncesPage /></Suspensed> },
            {
              element: <ProtectedRoute allowedRoles={['admin']} />,
              children: [
                { path: 'utilisateurs', element: <Suspensed><UtilisateursPage /></Suspensed> },
                { path: 'parents',      element: <Suspensed><ParentsPage /></Suspensed> },
              ],
            },
          ],
        },
      ],
    },

    { path: '*', element: <Navigate to="/dashboard" replace /> },
])
