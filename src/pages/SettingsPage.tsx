import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/toast'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Bell, CheckCircle2, AlertCircle, User, ShieldCheck, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SettingsPage() {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProfileSettings()
    }
  }, [user])

  const fetchProfileSettings = async () => {
    if (!user) return
    setLoading(true)
    setErrorMsg('')
    try {
      const { data, error } = await (supabase.from('profiles') as any)
        .select('email_notifications')
        .eq('id', user.id)
        .single()

      if (error) throw error
      if (data) {
        setEmailNotifications(data.email_notifications)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async () => {
    if (!user || saving) return
    const newValue = !emailNotifications

    setEmailNotifications(newValue)
    setSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({
          email_notifications: newValue,
        })
        .eq('id', user.id)

      if (error) throw error
      const msg = newValue ? 'Email alerts enabled.' : 'Email alerts disabled.'
      setSuccessMsg(msg)
      toast.success('Settings Saved', msg)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setEmailNotifications(!newValue)
      const msg = err.message || 'Failed to update preferences.'
      setErrorMsg(msg)
      toast.error('Settings Error', msg)
    } finally {
      setSaving(false)
    }
  }

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col md:flex-row font-sans"
    >
      {/* SIDEBAR NAVIGATION */}
      <Sidebar activeTab="settings" />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* HEADER PANEL */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-900/80">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
                Settings
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Account Preferences
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Configure your account details, report notifications, and alert thresholds.
              </p>
            </div>
          </div>

          {/* STATUS BLOCK */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start gap-2.5"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <motion.div
              animate={{ opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 h-48 space-y-4"
            >
              <div className="h-6 bg-slate-800 rounded w-1/4"></div>
              <div className="h-4 bg-slate-800 rounded w-1/2"></div>
              <div className="h-4 bg-slate-800 rounded w-1/3"></div>
            </motion.div>
          ) : (
            <div className="space-y-6">
              
              {/* USER PROFILE CARD */}
              <Card className="bg-[#0b0f19] border-slate-800/80 text-slate-100 rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-400" /> Account Profile
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Your authenticated user session details.
                  </CardDescription>
                </CardHeader>
                <div className="p-6 pt-0 space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shrink-0">
                      {userInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        {user?.email}
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Active Account
                        </span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Supabase RLS Protected Session
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* NOTIFICATION PREFERENCES CARD */}
              <Card className="bg-[#0b0f19] border-slate-800/80 text-slate-100 rounded-2xl overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-400" /> Notification & Alert Preferences
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Control automated report generation and email drop alerts.
                  </CardDescription>
                </CardHeader>
                <div className="p-6 pt-0 space-y-6">
                  
                  {/* Email Notifications Toggle */}
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-amber-400" /> Email Health Alerts & Reports
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
                        Automatically dispatch styled audit summaries via Resend when a scan finishes or when website health drops by 10 points or more.
                      </p>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={handleToggle}
                      disabled={saving}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        emailNotifications ? 'bg-emerald-500' : 'bg-slate-800'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                          emailNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </motion.button>
                  </div>

                </div>
              </Card>

            </div>
          )}

        </div>
      </main>
    </motion.div>
  )
}
