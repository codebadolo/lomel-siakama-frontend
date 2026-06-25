import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation } from 'react-router-dom'
import { GraduationCap, Mail, Lock } from 'lucide-react'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/store/auth.store'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const schema = z.object({
  email:    z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})
type FormData = z.infer<typeof schema>

const STATS = [
  { value: '500+', label: 'Élèves' },
  { value: '12',   label: 'Établissements' },
  { value: '800+', label: 'Parents connectés' },
]

export function LoginPage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { setUser, setTokens } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      const tokens = await authApi.login(data)
      setTokens(tokens.access, tokens.refresh)
      const user = await authApi.me()
      setUser(user)
      navigate(from, { replace: true })
    } catch {
      setError('Email ou mot de passe incorrect.')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-[480px] bg-indigo-600 flex-col justify-between p-12 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">SGS</span>
        </div>

        <div>
          <h1 className="text-[40px] font-bold text-white leading-[1.15] tracking-tight">
            Système de<br />Gestion<br />Scolaire
          </h1>
          <p className="mt-5 text-indigo-200 text-[15px] leading-relaxed max-w-sm">
            Gérez votre établissement, communiquez avec les parents et suivez
            les résultats depuis une seule interface.
          </p>
        </div>

        <div className="flex gap-10">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-sm text-indigo-300 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-[360px]">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <GraduationCap size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">SGS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Connexion</h2>
            <p className="mt-1.5 text-sm text-gray-500">Accédez à votre espace de gestion</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Adresse email"
              type="email"
              placeholder="admin@ecole.ci"
              autoComplete="email"
              autoFocus
              leftIcon={<Mail size={14} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              leftIcon={<Lock size={14} />}
              error={errors.password?.message}
              {...register('password')}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
              Se connecter
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
