import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Settings, Loader2, Bell, CheckCircle2, AlertCircle } from 'lucide-react'

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

      if (error) {
        // If the column doesn't exist in local schema yet (or hasn't been migrated), default to true
        console.warn('Could not read email_notifications profile attribute:', error.message)
        setEmailNotifications(true)
      } else if (data) {
        setEmailNotifications(data.email_notifications ?? true)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleNotifications = async () => {
    if (!user) return
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <Sidebar activeTab="settings" />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* HEADER */}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
              <Settings className="h-7 w-7 text-emerald-400" />
              Settings
            </h1>
            <p className="text-sm text-slate-400 mt-1">Configure your personal preferences and alerts.</p>
          </div>

          {/* STATUS NOTIFICATIONS */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* NOTIFICATION CARD */}
              <Card className="bg-slate-900/40 border-slate-800 text-slate-100">
                <CardHeader>
                  <CardTitle className="text-md font-bold text-slate-200 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-emerald-400" /> Email Notifications
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Receive scores, diagnostics reports, and critical alerts sent directly to your account inbox.
                  </CardDescription>
                </CardHeader>
                
                <div className="p-6 pt-0 border-t border-slate-800/40 mt-4">
                  <div className="flex items-center justify-between mt-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-slate-200">Enable Email Reports</p>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Sends scan complete summaries and triggers score drop alerts if a site's health index drops by 10 points or more.
                      </p>
                    </div>
                    
                    {/* PREMIUM SLATE TOGGLE SWITCH */}
                    <button
                      onClick={handleToggleNotifications}
                      disabled={saving}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-1 focus:ring-emerald-500 ${
                        emailNotifications ? 'bg-emerald-500' : 'bg-slate-800'
                      } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                          emailNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </Card>

            </div>
          )}

        </div>
      </main>

    </div>
  )
}
