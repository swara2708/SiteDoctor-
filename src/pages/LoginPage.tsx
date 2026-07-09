import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Activity, AlertCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Inline touched / error states
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const validateEmail = (val: string) => {
    if (!val.trim()) {
      return 'Email address is required.'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(val)) {
      return 'Please enter a valid email address.'
    }
    return ''
  }

  const validatePassword = (val: string) => {
    if (!val) {
      return 'Password is required.'
    }
    return ''
  }

  const handleEmailBlur = () => {
    setEmailError(validateEmail(email))
  }

  const handlePasswordBlur = () => {
    setPasswordError(validatePassword(password))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    
    const eErr = validateEmail(email)
    const pErr = validatePassword(password)
    
    if (eErr || pErr) {
      setEmailError(eErr)
      setPasswordError(pErr)
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setErrorMsg(error.message)
      } else if (data.user) {
        navigate('/dashboard')
      } else {
        setErrorMsg('Something went wrong during sign in.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 font-sans"
    >
      <div className="w-full max-w-md space-y-8 bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <Activity className="h-8 w-8 text-emerald-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
                SiteDoctor+
              </span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Sign in to your account</h2>
          <p className="mt-2 text-xs text-slate-400">
            Or{' '}
            <Link to="/signup" className="font-semibold text-emerald-400 hover:text-emerald-350 transition-colors">
              create a new account
            </Link>
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Email address *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                onBlur={handleEmailBlur}
                className={emailError ? 'border-red-500 focus:ring-red-500' : ''}
                disabled={loading}
                required
              />
              {emailError && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Password *
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError('')
                }}
                onBlur={handlePasswordBlur}
                className={passwordError ? 'border-red-500 focus:ring-red-500' : ''}
                disabled={loading}
                required
              />
              {passwordError && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">
                  {passwordError}
                </p>
              )}
            </div>
          </div>

          <div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </motion.div>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
