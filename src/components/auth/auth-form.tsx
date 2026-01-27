import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'

const authSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type AuthFormData = z.infer<typeof authSchema>

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up'
}

export function AuthForm({ mode }: AuthFormProps) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const logoSrc = theme === 'dark' ? '/light-logo.png' : '/dark-logo.png'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  })

  const onSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true)
    try {
      const { error } =
        mode === 'sign-in'
          ? await signIn(data.email, data.password)
          : await signUp(data.email, data.password)

      if (error) {
        toast.error(error.message)
        return
      }

      if (mode === 'sign-up') {
        toast.success('Account created! Please check your email to verify.')
        reset()
      } else {
        toast.success('Welcome back!')
        navigate('/dashboard')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSignIn = mode === 'sign-in'

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        toast.error(error.message)
      }
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <img 
              src={logoSrc} 
              alt="SoftHub Tracker" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-2xl">
            {isSignIn ? 'Welcome back' : 'Create an account'}
          </CardTitle>
          <CardDescription>
            {isSignIn
              ? 'Sign in to your account to continue'
              : 'Enter your email to create your account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSubmitting}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
        </CardContent>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isSignIn && (
                  <Link
                    to="/auth/forgot-password"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignIn ? 'Sign In' : 'Create Account'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isSignIn ? (
                <>
                  Don't have an account?{' '}
                  <Link
                    to="/auth/sign-up"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Link
                    to="/auth/sign-in"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
