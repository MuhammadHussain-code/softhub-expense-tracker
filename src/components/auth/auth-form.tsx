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
  const { signIn, signUp } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

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
