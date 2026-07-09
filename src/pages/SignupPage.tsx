import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Activity, AlertCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Inline touched / error states
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const validateName = (val: string) => {
    if (!val.trim()) {
      return 'Full name is required.'
    }
    return ''
  }

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
    if (val.length < 6) {
      return 'Password must be at least 6 characters.'
    }
    return ''
  }

  const handleNameBlur = () => {
    setNameError(validateName(fullName))
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

    const nameErr = validateName(fullName)
    const emailErr = validateEmail(email)
    const passErr = validatePassword(password)

    if (nameErr || emailErr || passErr) {
      setNameError(nameErr)
      setEmailError(emailErr)
      setPasswordError(passErr)
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (error) {
        setErrorMsg(error.message)
      } else if (data.user) {
        navigate('/dashboard')
      } else {
        setErrorMsg('Something went wrong during sign up.')
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
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 cursor-pointer mb-2" onClick={() => navigate('/')}>
            <Activity className="h-8 w-8 text-emerald-400" aria-hidden="true" />
            <span className="text-2xl font-extrabold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
              SiteDoctor+
            </span>
          </div>
          <h2 className="mt-2 text-center text-2xl font-bold text-slate-100">
            Create your account
          </h2>
          <p className="mt-1.5 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-emerald-400 hover:text-emerald-350 hover:underline">
              Sign in to existing account
            </Link>
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-xs flex items-start gap-2" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <div>
              <label htmlFor="full-name" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Full Name
              </label>
              <Input
                id="full-name"
                name="name"
                type="text"
                required
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  if (nameError) setNameError('')
                }}
                onBlur={handleNameBlur}
                className={nameError ? 'border-red-500 focus:ring-red-500' : ''}
                placeholder="John Doe"
                disabled={loading}
              />
              {nameError && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Email Address
              </label>
              <Input
                id="email-address"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                onBlur={handleEmailBlur}
                className={emailError ? 'border-red-500 focus:ring-red-500' : ''}
                placeholder="you@example.com"
                disabled={loading}
              />
              {emailError && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">
                  {emailError}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 mb-1.5">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError('')
                }}
                onBlur={handlePasswordBlur}
                className={passwordError ? 'border-red-500 focus:ring-red-500' : ''}
                placeholder="Min 6 characters"
                disabled={loading}
              />
              {passwordError && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">
                  {passwordError}
                </p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </motion.div>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
