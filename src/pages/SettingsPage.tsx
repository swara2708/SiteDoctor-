import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Settings, Bell, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SettingsPage() {
  const { user } = useAuth()

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
    
    // Optimistic UI update
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
      setSuccessMsg('Notification preferences updated successfully.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      // Revert local toggle state on error
      setEmailNotifications(!newValue)
      setErrorMsg(err.message || 'Failed to update preferences.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans"
    >
      
      {/* SIDEBAR NAVIGATION */}
      <Sidebar activeTab="settings" />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* HEADER PANEL */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Settings</h1>
              <p className="text-sm text-slate-400 mt-1">Configure account configuration and notifications.</p>
            </div>
          </div>

          {/* STATUS BLOCK */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SETTINGS CARD */}
          {loading ? (
            <motion.div 
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 h-48"
            >
              <div className="h-6 bg-slate-850 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-slate-850 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-slate-850 rounded w-1/3"></div>
            </motion.div>
          ) : (
            <div className="max-w-xl">
              
              <Card className="bg-slate-900/30 border-slate-800 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-md font-bold text-slate-200 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-emerald-400" />
                    General Settings
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-550">
                    Preferences for reports, scans, and system notifications.
                  </CardDescription>
                </CardHeader>
                <div className="p-6 pt-0 space-y-6">
                  
                  {/* Email Notifications Toggle */}
                  <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-slate-950/40 border border-slate-900">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-slate-400" /> Email Notifications
                      </p>
                      <p className="text-xs text-slate-500 leading-normal">
                        Receive detailed reports and alerts via email when website health drops or scans complete.
                      </p>
                    </div>
                    
                    <motion.button
                      whileTap={{ scale: 0.9 }}
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
