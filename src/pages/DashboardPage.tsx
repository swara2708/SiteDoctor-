import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog'
import Sidebar from '../components/Sidebar'
import {
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Globe,
  Calendar,
  AlertTriangle,
  Play,
  Loader2,
  AlertCircle,
  Download
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResponsiveContainer, LineChart, Line } from 'recharts'
import AnimatedNumber from '../components/AnimatedNumber'
import { exportToPDF } from '../utils/pdfExport'

interface ImageFlag {
  image_url: string
  looks_like_stock_photo: boolean
  reasoning: string
  quality_flag: string
  relevance_note: string
}

interface Scan {
  id: string
  site_id: string
  seo_score: number | null
  trust_score: number | null
  combined_score: number | null
  seo_report: any
  trust_report: any
  image_flags: ImageFlag[] | null
  scanned_at: string
}

interface Site {
  id: string
  user_id: string
  url: string
  nickname: string | null
  created_at: string
  scans?: Scan[]
}

function ProgressRing({ value, label, type, size = 68 }: { value: number; label: string; type: 'seo' | 'trust' | 'combined'; size?: number }) {
  const radius = size * 0.36
  const strokeWidth = size * 0.08
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  let strokeColor = 'currentColor'
  let colorClass = ''
  
  if (type === 'seo') {
    colorClass = 'text-emerald-400'
  } else if (type === 'trust') {
    colorClass = 'text-amber-400'
  } else {
    strokeColor = 'url(#combinedGrad)'
    colorClass = 'text-transparent'
  }

  return (
    <div className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/40 relative group hover:border-slate-700/60 transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/5">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="combinedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-850"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Fill */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          className={colorClass}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: strokeDashoffset }}
          transition={{ duration: 1.0, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      {/* Center number */}
      <span className="absolute text-[13px] font-extrabold text-slate-100" style={{ top: 'calc(50% - 14px)' }}>
        <AnimatedNumber value={value} />
      </span>
      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mt-2">{label}</span>
    </div>
  )
}


export default function DashboardPage() {
  const { user } = useAuth()

  // State lists
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Scanning state maps (tracked per site id)
  const [scanningSites, setScanningSites] = useState<Record<string, boolean>>({})
  const [scanErrors, setScanErrors] = useState<Record<string, string>>({})

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Form states
  const [siteUrl, setSiteUrl] = useState('')
  const [siteNickname, setSiteNickname] = useState('')
  const [activeSite, setActiveSite] = useState<Site | null>(null)
  const [editNickname, setEditNickname] = useState('')

  // Action loading state
  const [actionLoading, setActionLoading] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null)

  const handleDownloadPdf = async (siteName: string, url: string, scan: any) => {
    setDownloadingPdfId(scan.id)
    try {
      exportToPDF(siteName, url, scan)
    } catch (err: any) {
      console.error('[SiteDoctor+] PDF generation error:', err)
      alert('Failed to export PDF report. Please try again.')
    } finally {
      setDownloadingPdfId(null)
    }
  }

  // Form Inline Validation Errors
  const [addUrlError, setAddUrlError] = useState('')
  const [editNicknameError, setEditNicknameError] = useState('')

  useEffect(() => {
    fetchSites()
    fetchUserProfile()
  }, [user])

  const fetchUserProfile = async () => {
    if (!user) return
    try {
      const { data } = await (supabase.from('profiles') as any)
        .select('email_notifications')
        .eq('id', user.id)
        .single()
      if (data) {
        setEmailNotifications(data.email_notifications ?? true)
      }
    } catch (err) {
      console.warn('Could not read user profile settings:', err)
    }
  }

  const fetchSites = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      // Fetch sites and pre-load their nested scans ordered by scanned_at desc
      const { data, error } = await (supabase.from('sites') as any)
        .select(`
          *,
          scans (
            id,
            site_id,
            seo_score,
            trust_score,
            combined_score,
            seo_report,
            trust_report,
            image_flags,
            scanned_at
          )
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setSites(data || [])
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch websites.')
    } finally {
      setLoading(false)
    }
  }


  // TRIGGER Website Scan
  const handleScan = async (site: Site) => {
    // Set scanning state to true
    setScanningSites((prev) => ({ ...prev, [site.id]: true }))
    setScanErrors((prev) => ({ ...prev, [site.id]: '' }))

    const latestScan = getLatestScan(site)
    const previousScan = latestScan ? {
      combined_score: latestScan.combined_score,
      seo_score: latestScan.seo_score,
      trust_score: latestScan.trust_score
    } : null

    try {
      // 1. Call server-side Vite middleware to bypass CORS & run Groq AI analysis
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: site.url,
          user_email: user?.email,
          email_notifications: emailNotifications,
          previous_scan: previousScan
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Server failed to analyze the site.')
      }

      const scanResult = await res.json()

      // 2. Insert scan report into Supabase under the user session (verifies RLS checks)
      const { error: dbError } = await (supabase.from('scans') as any)
        .insert({
          site_id: site.id,
          seo_score: scanResult.seo_score,
          trust_score: scanResult.trust_score,
          combined_score: scanResult.combined_score,
          seo_report: scanResult.seo_report,
          trust_report: scanResult.trust_report,
          image_flags: scanResult.image_flags, // Save image_flags array
        })

      if (dbError) throw dbError

      // Refresh sites list to display new scores
      await fetchSites()
    } catch (err: any) {
      console.error(err)
      setScanErrors((prev) => ({
        ...prev,
        [site.id]: err.message || 'Scanning process failed.',
      }))
    } finally {
      setScanningSites((prev) => ({ ...prev, [site.id]: false }))
    }
  }

  // CREATE site
  const handleAddSite = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    let formattedUrl = siteUrl.trim()
    if (!formattedUrl) {
      setAddUrlError('Website URL is required.')
      return
    }

    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`
    }

    try {
      new URL(formattedUrl)
    } catch (_) {
      setAddUrlError('Please enter a valid website URL.')
      return
    }

    if (!user) return
    setActionLoading(true)

    try {
      const { error } = await (supabase.from('sites') as any)
        .insert({
          user_id: user.id,
          url: formattedUrl,
          nickname: siteNickname.trim() || null,
        })

      if (error) throw error

      setSiteUrl('')
      setSiteNickname('')
      setIsAddOpen(false)
      fetchSites()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add website.')
    } finally {
      setActionLoading(false)
    }
  }

  // UPDATE site nickname
  const handleEditNickname = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setEditNicknameError('')

    if (editNickname.trim().length > 50) {
      setEditNicknameError('Nickname cannot exceed 50 characters.')
      return
    }

    if (!activeSite) return
    setActionLoading(true)

    try {
      const { error } = await (supabase.from('sites') as any)
        .update({
          nickname: editNickname.trim() || null,
        })
        .eq('id', activeSite.id)

      if (error) throw error

      setIsEditOpen(false)
      setActiveSite(null)
      setEditNickname('')
      fetchSites()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update website nickname.')
    } finally {
      setActionLoading(false)
    }
  }

  // DELETE site
  const handleDeleteSite = async () => {
    if (!activeSite) return
    setErrorMsg('')
    setActionLoading(true)

    try {
      const { error } = await (supabase.from('sites') as any)
        .delete()
        .eq('id', activeSite.id)

      if (error) throw error

      setIsDeleteOpen(false)
      setActiveSite(null)
      fetchSites()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete website.')
    } finally {
      setActionLoading(false)
    }
  }

  const openEditModal = (site: Site) => {
    setActiveSite(site)
    setEditNickname(site.nickname || '')
    setEditNicknameError('')
    setIsEditOpen(true)
  }

  const openDeleteModal = (site: Site) => {
    setActiveSite(site)
    setIsDeleteOpen(true)
  }

  // Helper to resolve the latest scan
  const getLatestScan = (site: Site): Scan | null => {
    if (!site.scans || site.scans.length === 0) return null
    return [...site.scans].sort(
      (a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
    )[0]
  }

  // Helper to resolve sparkline data
  const getSparklineData = (site: Site) => {
    if (!site.scans || site.scans.length < 2) return null
    const sorted = [...site.scans].sort(
      (a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
    )
    const last5 = sorted.slice(-5)
    return last5.map((scan) => ({
      score: scan.combined_score || 0
    }))
  }



  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row font-sans"
    >
      
      {/* SIDEBAR NAVIGATION */}
      <Sidebar activeTab="sites" />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* HEADER PANEL */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">My Websites</h1>
              <p className="text-sm text-slate-400 mt-1">Add website properties and scan them using Groq AI and Vision.</p>
            </div>
            <Button 
              onClick={() => setIsAddOpen(true)}
              className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 inline-flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" /> Add Website
            </Button>
          </div>

          {/* ERROR STATUS BLOCK */}
          <AnimatePresence>
            {errorMsg && !isAddOpen && !isEditOpen && !isDeleteOpen && (
              <motion.div 
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
          </AnimatePresence>

          {/* SITES GRID LIST */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((n) => (
                <motion.div 
                  key={n} 
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2 w-2/3">
                      <div className="h-4 bg-slate-850 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-850 rounded w-1/2"></div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <div className="h-8 w-8 rounded bg-slate-850"></div>
                      <div className="h-8 w-8 rounded bg-slate-850"></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/40">
                    <div className="h-10 rounded bg-slate-850"></div>
                    <div className="h-10 rounded bg-slate-850"></div>
                    <div className="h-10 rounded bg-slate-850"></div>
                  </div>
                  
                  <div className="h-8 bg-slate-950/40 rounded-lg flex items-center justify-between px-3 mt-4">
                    <div className="h-3 bg-slate-850 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-850 rounded w-1/3"></div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 max-w-xl mx-auto">
              <Globe className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-300">No websites monitored</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                Add your first website to get started with SEO diagnostics and trustworthiness scanning.
              </p>
              <Button 
                onClick={() => {
                  setAddUrlError('')
                  setErrorMsg('')
                  setSiteUrl('')
                  setSiteNickname('')
                  setIsAddOpen(true)
                }}
                className="mt-6 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
              >
                Add your first site
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <AnimatePresence mode="popLayout">
                {sites.map((site, index) => {
                const latestScan = getLatestScan(site)
                const isScanning = !!scanningSites[site.id]
                const scanError = scanErrors[site.id]


                return (
                  <motion.div
                    key={site.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      transition: { 
                        duration: 0.4, 
                        ease: 'easeOut',
                        delay: index * 0.05 
                      } 
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.95,
                      y: -20,
                      transition: { duration: 0.3 } 
                    }}
                    className="h-full flex flex-col"
                  >
                    <Card className={`relative bg-[#0b0f19] border-slate-900/80 text-slate-100 hover:border-slate-800/80 transition-all flex flex-col justify-between h-full overflow-hidden ${
                      scanningSites[site.id] ? 'border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5' : ''
                    }`}>
                      {scanningSites[site.id] && (
                        <>
                          <motion.div 
                            className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80 z-20 pointer-events-none"
                            animate={{ y: [0, 450, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                          />
                          <motion.div 
                            className="absolute inset-0 bg-emerald-500/5 pointer-events-none z-10"
                            animate={{ opacity: [0.1, 0.4, 0.1] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          />
                        </>
                      )}
                    <CardHeader className="pb-4 relative z-20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="truncate">
                          <CardTitle className="text-lg font-bold text-slate-200 truncate" title={site.nickname || site.url}>
                            {site.nickname || site.url}
                          </CardTitle>
                          {site.nickname && (
                            <span className="text-xs text-slate-500 truncate block mt-0.5">{site.url}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <Button 
                            onClick={() => openEditModal(site)}
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                            disabled={isScanning}
                            aria-label={`Edit Nickname for ${site.nickname || site.url}`}
                          >
                            <Edit2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button 
                            onClick={() => openDeleteModal(site)}
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                            disabled={isScanning}
                            aria-label={`Delete ${site.nickname || site.url}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>

                      {/* Display Score Rings if scan exists */}
                      {latestScan && !isScanning && (
                        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/50">
                          <ProgressRing value={latestScan.seo_score || 0} label="SEO" type="seo" />
                          <ProgressRing value={latestScan.trust_score || 0} label="Trust" type="trust" />
                          <ProgressRing value={latestScan.combined_score || 0} label="Index" type="combined" />
                        </div>
                      )}

                      {/* Trend Sparkline */}
                      {latestScan && !isScanning && (
                        <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between gap-4">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Trend</span>
                          {(() => {
                            const sparkData = getSparklineData(site)
                            if (!sparkData) {
                              return <span className="text-[10px] text-slate-655 italic">Not enough data yet</span>
                            }
                            return (
                              <div className="w-24 h-6">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={sparkData}>
                                    <Line 
                                      type="monotone" 
                                      dataKey="score" 
                                      stroke="#10b981" 
                                      strokeWidth={1.5} 
                                      dot={false} 
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )
                          })()}
                        </div>
                      )}

                      {/* Display No Scan Yet / Scanning / Scan Error message */}
                      {isScanning ? (
                        <div className="mt-6 flex flex-col items-center justify-center p-6 border border-dashed border-slate-800 bg-slate-950/10 rounded-xl space-y-3">
                          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                          <span className="text-xs text-slate-400 font-semibold">Running full website audit...</span>
                        </div>
                      ) : !latestScan ? (
                        <div className="mt-6 flex flex-col items-center justify-center p-6 border border-dashed border-slate-850 bg-slate-950/20 rounded-xl space-y-2 text-center">
                          <AlertTriangle className="h-6 w-6 text-amber-500/80" />
                          <span className="text-xs text-slate-400 font-semibold">No scans executed yet</span>
                          <p className="text-[10px] text-slate-500 max-w-[200px]">Click the button below to initiate your first audit.</p>
                        </div>
                      ) : null}

                      {scanError && (
                        <div className="mt-4 p-2 bg-red-950/30 border border-red-500/20 rounded text-xs text-red-400 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{scanError}</span>
                        </div>
                      )}

                      <CardDescription className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-slate-600" />
                        Added: {new Date(site.created_at).toLocaleDateString()}
                        {latestScan && (
                          <span className="ml-auto text-[10px] opacity-75">
                            Last scan: {new Date(latestScan.scanned_at).toLocaleDateString()}
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    
                    <div className="px-6 pb-6 pt-3 border-t border-slate-800/80 flex items-center justify-between mt-auto gap-2">
                      <div className="flex items-center gap-3">
                        <a 
                          href={site.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
                        >
                          Visit <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {latestScan && (
                          <>
                            <Button
                              onClick={() => handleDownloadPdf(site.nickname || site.url, site.url, latestScan)}
                              disabled={downloadingPdfId === latestScan.id}
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-slate-100 flex items-center justify-center"
                              title="Download PDF Report"
                            >
                              {downloadingPdfId === latestScan.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                            </Button>

                            <Link to={`/dashboard/sites/${site.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs border-slate-800 text-slate-350 hover:bg-slate-800 hover:text-slate-100"
                              >
                                View Details
                              </Button>
                            </Link>
                          </>
                        )}

                        <Button
                          onClick={() => handleScan(site)}
                          disabled={isScanning}
                          size="sm"
                          className="h-8 text-xs bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 flex items-center gap-1"
                        >
                          {isScanning ? (
                            <>Scanning...</>
                          ) : latestScan ? (
                            <><Play className="h-3 w-3" /> Re-scan</>
                          ) : (
                            <><Play className="h-3 w-3" /> Scan Now</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* DIALOG: ADD SITE */}
      {/* ========================================================================= */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogHeader>
          <DialogTitle>Add Monitored Website</DialogTitle>
          <DialogDescription>
            Input the details of the website you want to check.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded text-xs mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAddSite} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Website URL *
            </label>
            <Input 
              id="site-url"
              type="text" 
              placeholder="e.g. google.com"
              value={siteUrl}
              onChange={(e) => {
                setSiteUrl(e.target.value)
                if (addUrlError) setAddUrlError('')
              }}
              required
              disabled={actionLoading}
            />
            {addUrlError && (
              <p className="mt-1.5 text-xs text-red-400 font-medium">
                {addUrlError}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Nickname (Optional)
            </label>
            <Input 
              type="text" 
              placeholder="e.g. My Portfolio"
              value={siteNickname}
              onChange={(e) => setSiteNickname(e.target.value)}
              disabled={actionLoading}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAddOpen(false)}
              className="border-slate-800 text-slate-300 hover:bg-slate-800"
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving...' : 'Add Website'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: EDIT NICKNAME */}
      {/* ========================================================================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogHeader>
          <DialogTitle>Edit Nickname</DialogTitle>
          <DialogDescription>
            Change the nickname for {activeSite?.url}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded text-xs mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleEditNickname} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Nickname
            </label>
            <Input 
              id="edit-nickname"
              type="text" 
              placeholder="e.g. Work Blog"
              value={editNickname}
              onChange={(e) => {
                setEditNickname(e.target.value)
                if (editNicknameError) setEditNicknameError('')
              }}
              disabled={actionLoading}
            />
            {editNicknameError && (
              <p className="mt-1.5 text-xs text-red-400 font-medium">
                {editNicknameError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsEditOpen(false)}
              className="border-slate-800 text-slate-300 hover:bg-slate-800"
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
              disabled={actionLoading}
            >
              {actionLoading ? 'Saving...' : 'Save Nickname'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: DELETE SITE CONFIRMATION */}
      {/* ========================================================================= */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-4">
            <Trash2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Delete Website</DialogTitle>
          <DialogDescription className="text-center">
            Are you sure you want to delete <span className="font-semibold text-slate-200">{activeSite?.nickname || activeSite?.url}</span>? This will delete all scan history for this site.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded text-xs mb-4">
            {errorMsg}
          </div>
        )}

        <DialogFooter className="sm:justify-center">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setIsDeleteOpen(false)}
            className="border-slate-800 text-slate-300 hover:bg-slate-800"
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleDeleteSite}
            className="bg-red-600 hover:bg-red-700 text-white font-bold"
            disabled={actionLoading}
          >
            {actionLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>

    </motion.div>
  )
}
