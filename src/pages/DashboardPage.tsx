import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/toast'
import { supabase } from '../lib/supabaseClient'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardHeader } from '../components/ui/card'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog'
import Sidebar from '../components/Sidebar'
import Folder from '../components/ui/Folder'
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
  Download,
  Search,
  MoreVertical,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers
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

function ProgressRing({ value, label, type, size = 64 }: { value: number; label: string; type: 'seo' | 'trust' | 'combined'; size?: number }) {
  const radius = size * 0.36
  const strokeWidth = size * 0.085
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  let strokeColor = 'currentColor'
  let colorClass = ''

  if (type === 'seo') {
    colorClass = 'text-emerald-400'
  } else if (type === 'trust') {
    colorClass = 'text-amber-400'
  } else {
    strokeColor = 'url(#combinedGradDashboard)'
    colorClass = 'text-transparent'
  }

  return (
    <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-800/80 bg-slate-900/40 relative group hover:border-slate-700/60 transition-all duration-300">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="combinedGradDashboard" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-800/60"
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
      <span className="absolute text-[12px] font-extrabold text-slate-100" style={{ top: 'calc(50% - 13px)' }}>
        <AnimatedNumber value={value} />
      </span>
      <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400 mt-1">{label}</span>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  // State lists
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Action popover state per site
  const [activeMenuSiteId, setActiveMenuSiteId] = useState<string | null>(null)

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

  // Form Inline Validation Errors
  const [addUrlError, setAddUrlError] = useState('')
  const [editNicknameError, setEditNicknameError] = useState('')

  useEffect(() => {
    fetchSites()
    fetchUserProfile()
  }, [user])

  // Close open popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuSiteId(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

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
    setScanningSites((prev) => ({ ...prev, [site.id]: true }))
    setScanErrors((prev) => ({ ...prev, [site.id]: '' }))
    toast.info('Audit Started', `Scanning ${site.nickname || site.url} with AI & Vision...`)

    const latestScan = getLatestScan(site)
    const previousScan = latestScan ? {
      combined_score: latestScan.combined_score,
      seo_score: latestScan.seo_score,
      trust_score: latestScan.trust_score
    } : null

    try {
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

      const { error: dbError } = await (supabase.from('scans') as any)
        .insert({
          site_id: site.id,
          seo_score: scanResult.seo_score,
          trust_score: scanResult.trust_score,
          combined_score: scanResult.combined_score,
          seo_report: scanResult.seo_report,
          trust_report: scanResult.trust_report,
          image_flags: scanResult.image_flags,
        })

      if (dbError) throw dbError

      toast.success('Audit Complete', `Health Index: ${scanResult.combined_score}/100`)
      await fetchSites()
    } catch (err: any) {
      console.error(err)
      const msg = err.message || 'Scanning process failed.'
      setScanErrors((prev) => ({ ...prev, [site.id]: msg }))
      toast.error('Audit Failed', msg)
    } finally {
      setScanningSites((prev) => ({ ...prev, [site.id]: false }))
    }
  }

  // CREATE site
  const handleAddSite = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setAddUrlError('')

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

      toast.success('Website Added', `${formattedUrl} added to workspace`)
      setSiteUrl('')
      setSiteNickname('')
      setIsAddOpen(false)
      fetchSites()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add website.')
      toast.error('Error', err.message || 'Failed to add website.')
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

      toast.success('Updated', 'Website nickname updated.')
      setIsEditOpen(false)
      setActiveSite(null)
      setEditNickname('')
      fetchSites()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update website nickname.')
      toast.error('Error', 'Failed to update nickname.')
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

      toast.success('Deleted', 'Website removed from account.')
      setIsDeleteOpen(false)
      setActiveSite(null)
      fetchSites()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete website.')
      toast.error('Error', 'Failed to delete website.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadPdf = async (siteName: string, url: string, scan: any) => {
    setDownloadingPdfId(scan.id)
    try {
      exportToPDF(siteName, url, scan)
      toast.success('PDF Exported', 'Report saved as PDF document')
    } catch (err: any) {
      console.error('[SiteDoctor+] PDF generation error:', err)
      toast.error('PDF Failed', 'Could not export PDF report')
    } finally {
      setDownloadingPdfId(null)
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

  const getLatestScan = (site: Site): Scan | null => {
    if (!site.scans || site.scans.length === 0) return null
    return [...site.scans].sort(
      (a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
    )[0]
  }

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

  // Filter sites by search term
  const filteredSites = sites.filter(
    (s) =>
      s.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nickname && s.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Compute Stats Summary
  const validScans = sites.map(getLatestScan).filter(Boolean) as Scan[]
  const avgCombinedScore = validScans.length > 0
    ? Math.round(validScans.reduce((sum, s) => sum + (s.combined_score || 0), 0) / validScans.length)
    : 0
  const avgSeoScore = validScans.length > 0
    ? Math.round(validScans.reduce((sum, s) => sum + (s.seo_score || 0), 0) / validScans.length)
    : 0
  const avgTrustScore = validScans.length > 0
    ? Math.round(validScans.reduce((sum, s) => sum + (s.trust_score || 0), 0) / validScans.length)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-emerald-500/30 selection:text-emerald-200"
    >
      {/* SIDEBAR NAVIGATION */}
      <Sidebar activeTab="sites" />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* HEADER & ACTIONS BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-900/80">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
                My Websites
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {sites.length} {sites.length === 1 ? 'Property' : 'Properties'}
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Monitor technical SEO health and content trustworthiness powered by Groq Llama 3.3 & Vision.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <Button
                onClick={() => {
                  setAddUrlError('')
                  setErrorMsg('')
                  setSiteUrl('')
                  setSiteNickname('')
                  setIsAddOpen(true)
                }}
                className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 shadow-md shadow-emerald-500/10 inline-flex items-center gap-2 text-xs md:text-sm px-4 py-2"
              >
                <Plus className="h-4 w-4" /> Add Website
              </Button>
            </div>
          </div>

          {/* STATS OVERVIEW CARDS (KPI Grid) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/60 transition-colors">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Monitored Sites</span>
                <Globe className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-100">
                  <AnimatedNumber value={sites.length} />
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Active</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/60 transition-colors">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Avg Combined Health</span>
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-100">
                  <AnimatedNumber value={avgCombinedScore} />
                  <span className="text-xs text-slate-500 font-normal">/100</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Combined
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/60 transition-colors">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Avg Technical SEO</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-100">
                  <AnimatedNumber value={avgSeoScore} />
                  <span className="text-xs text-slate-500 font-normal">/100</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  SEO
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/60 transition-colors">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Avg Trust & Vision</span>
                <ShieldCheck className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-100">
                  <AnimatedNumber value={avgTrustScore} />
                  <span className="text-xs text-slate-500 font-normal">/100</span>
                </span>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                  Trust
                </span>
              </div>
            </div>
          </div>

          {/* SEARCH & CONTROLS */}
          {sites.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search websites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-900/60 border-slate-800 text-xs text-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
              <div className="text-xs text-slate-500 self-end sm:self-auto">
                Showing <span className="text-slate-300 font-medium">{filteredSites.length}</span> of {sites.length} sites
              </div>
            </div>
          )}

          {/* ERROR STATUS BLOCK */}
          <AnimatePresence>
            {errorMsg && !isAddOpen && !isEditOpen && !isDeleteOpen && (
              <motion.div
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
          </AnimatePresence>

          {/* SITES GRID / LIST */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((n) => (
                <motion.div
                  key={n}
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-6"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2 w-2/3">
                      <div className="h-4 bg-slate-800/80 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-slate-800/80"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="h-16 rounded-xl bg-slate-800/50"></div>
                    <div className="h-16 rounded-xl bg-slate-800/50"></div>
                    <div className="h-16 rounded-xl bg-slate-800/50"></div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/20 max-w-xl mx-auto px-6">
              <div className="flex justify-center mb-6 pt-4">
                <Folder
                  size={1.6}
                  color="#10b981"
                  items={[
                    <span key="1" className="text-[10px] font-bold text-slate-800">SEO Report</span>,
                    <span key="2" className="text-[10px] font-bold text-emerald-800">Trust Audit</span>,
                    <span key="3" className="text-[10px] font-bold text-teal-900">Health Index</span>
                  ]}
                />
              </div>
              <h3 className="text-lg font-bold text-slate-200">No websites monitored yet</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Add your first domain to scan technical SEO structure, verify copy trustworthiness, and detect AI placeholder images.
              </p>
              <Button
                onClick={() => {
                  setAddUrlError('')
                  setErrorMsg('')
                  setSiteUrl('')
                  setSiteNickname('')
                  setIsAddOpen(true)
                }}
                className="mt-6 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 px-5 py-2.5 shadow-lg shadow-emerald-500/10"
              >
                Add Your First Website
              </Button>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-12 border border-slate-800/60 rounded-xl bg-slate-900/20">
              <p className="text-sm text-slate-400">No websites match your search query "{searchQuery}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              <AnimatePresence mode="popLayout">
                {filteredSites.map((site, index) => {
                  const latestScan = getLatestScan(site)
                  const isScanning = !!scanningSites[site.id]
                  const scanError = scanErrors[site.id]
                  const sparklineData = getSparklineData(site)
                  const isMenuOpen = activeMenuSiteId === site.id

                  return (
                    <motion.div
                      key={site.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: {
                          duration: 0.3,
                          delay: index * 0.04,
                        },
                      }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                      className="h-full flex flex-col"
                    >
                      <Card
                        className={`relative bg-[#0b0f19] border-slate-800/80 text-slate-100 hover:border-slate-700/80 transition-all flex flex-col justify-between h-full overflow-hidden rounded-2xl ${
                          isScanning ? 'border-emerald-500/50 ring-1 ring-emerald-500/20 shadow-xl shadow-emerald-500/5' : ''
                        }`}
                      >
                        {/* Scanning Wave animation */}
                        {isScanning && (
                          <>
                            <motion.div
                              className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-90 z-20 pointer-events-none"
                              animate={{ y: [0, 320, 0] }}
                              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <motion.div
                              className="absolute inset-0 bg-emerald-500/5 pointer-events-none z-10"
                              animate={{ opacity: [0.1, 0.3, 0.1] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          </>
                        )}

                        <CardHeader className="pb-3 relative z-20">
                          <div className="flex items-start justify-between gap-3">
                            {/* Title & Domain */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3">
                                <div className="shrink-0 flex items-center justify-center">
                                  <Folder
                                    size={0.45}
                                    color="#10b981"
                                    items={[
                                      <span key="seo" className="text-[7px] font-black text-slate-900">SEO</span>,
                                      <span key="trust" className="text-[7px] font-black text-emerald-800">TRUST</span>,
                                      <span key="all" className="text-[7px] font-black text-slate-950">INDEX</span>
                                    ]}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <Link
                                    to={`/dashboard/sites/${site.id}`}
                                    className="text-base font-bold text-slate-100 hover:text-emerald-400 transition-colors truncate block"
                                    title={site.nickname || site.url}
                                  >
                                    {site.nickname || site.url.replace(/^https?:\/\//i, '')}
                                  </Link>
                                  {site.nickname && (
                                    <a
                                      href={site.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs text-slate-400 hover:text-slate-200 truncate flex items-center gap-1 mt-0.5"
                                    >
                                      <span>{site.url}</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* CONSOLIDATED ACTION POPOVER MENU (...) */}
                            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveMenuSiteId(isMenuOpen ? null : site.id)
                                }}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-850 rounded-lg"
                                aria-label="Site Options"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>

                              <AnimatePresence>
                                {isMenuOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 top-9 w-48 bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl z-50 p-1.5 space-y-0.5 text-xs"
                                  >
                                    <button
                                      onClick={() => {
                                        setActiveMenuSiteId(null)
                                        handleScan(site)
                                      }}
                                      disabled={isScanning}
                                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-lg transition-colors font-medium text-left disabled:opacity-50"
                                    >
                                      <Play className="h-3.5 w-3.5 text-emerald-400" />
                                      Run AI Audit Scan
                                    </button>

                                    <button
                                      onClick={() => {
                                        setActiveMenuSiteId(null)
                                        navigate(`/dashboard/sites/${site.id}`)
                                      }}
                                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-slate-200 hover:bg-slate-800 rounded-lg transition-colors font-medium text-left"
                                    >
                                      <Layers className="h-3.5 w-3.5 text-sky-400" />
                                      View Audit Details
                                    </button>

                                    {latestScan && (
                                      <button
                                        onClick={() => {
                                          setActiveMenuSiteId(null)
                                          handleDownloadPdf(site.nickname || site.url, site.url, latestScan)
                                        }}
                                        disabled={downloadingPdfId === latestScan.id}
                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-slate-200 hover:bg-slate-800 rounded-lg transition-colors font-medium text-left"
                                      >
                                        <Download className="h-3.5 w-3.5 text-amber-400" />
                                        Export PDF Report
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        setActiveMenuSiteId(null)
                                        openEditModal(site)
                                      }}
                                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-slate-200 hover:bg-slate-800 rounded-lg transition-colors font-medium text-left"
                                    >
                                      <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                                      Edit Nickname
                                    </button>

                                    <div className="h-px bg-slate-800/80 my-1" />

                                    <button
                                      onClick={() => {
                                        setActiveMenuSiteId(null)
                                        openDeleteModal(site)
                                      }}
                                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium text-left"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                      Delete Website
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </CardHeader>

                        {/* CARD BODY CONTENT */}
                        <div className="px-6 pb-6 pt-0 space-y-5 flex-1 flex flex-col justify-between relative z-20">
                          
                          {/* METRICS RINGS / STATUS */}
                          {latestScan ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-2">
                                <ProgressRing
                                  value={latestScan.seo_score || 0}
                                  label="SEO Health"
                                  type="seo"
                                  size={62}
                                />
                                <ProgressRing
                                  value={latestScan.trust_score || 0}
                                  label="Trust Index"
                                  type="trust"
                                  size={62}
                                />
                                <ProgressRing
                                  value={latestScan.combined_score || 0}
                                  label="Overall"
                                  type="combined"
                                  size={62}
                                />
                              </div>

                              {/* HISTORICAL SPARKLINE TREND */}
                              {sparklineData && sparklineData.length > 1 && (
                                <div className="h-8 w-full pt-1">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={sparklineData}>
                                      <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={false}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-6 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/20 text-center space-y-2">
                              <Sparkles className="h-6 w-6 text-slate-600 mx-auto" />
                              <p className="text-xs text-slate-400 font-medium">No audit reports generated yet</p>
                              <Button
                                onClick={() => handleScan(site)}
                                disabled={isScanning}
                                className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs px-3 py-1 h-8 font-bold"
                              >
                                {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                                Run First Audit
                              </Button>
                            </div>
                          )}

                          {/* SCAN ERROR FEEDBACK */}
                          {scanError && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2.5 rounded-lg text-xs flex items-start gap-2">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>{scanError}</span>
                            </div>
                          )}

                          {/* CARD FOOTER INFO & QUICK LINK */}
                          <div className="pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {latestScan
                                ? `Scanned ${new Date(latestScan.scanned_at).toLocaleDateString()}`
                                : `Added ${new Date(site.created_at).toLocaleDateString()}`}
                            </span>

                            <Link
                              to={`/dashboard/sites/${site.id}`}
                              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-xs group/link"
                            >
                              Details
                              <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
                            </Link>
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

      {/* ADD WEBSITE MODAL DIALOG */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-400" /> Add New Website
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Enter the target domain URL to start auditing SEO structure and copy trustworthiness.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSite} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Website URL *</label>
              <Input
                type="text"
                placeholder="https://example.com"
                value={siteUrl}
                onChange={(e) => {
                  setSiteUrl(e.target.value)
                  setAddUrlError('')
                }}
                className={`bg-slate-900 border-slate-800 text-sm ${
                  addUrlError ? 'border-red-500 focus:ring-red-500/20' : 'focus:border-emerald-500'
                }`}
                autoFocus
              />
              {addUrlError && <p className="text-xs text-red-400 mt-1">{addUrlError}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Nickname (Optional)</label>
              <Input
                type="text"
                placeholder="e.g. My SaaS Landing Page"
                value={siteNickname}
                onChange={(e) => setSiteNickname(e.target.value)}
                className="bg-slate-900 border-slate-800 text-sm focus:border-emerald-500"
              />
            </div>

            <DialogFooter className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Save Website
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>

      {/* EDIT NICKNAME MODAL DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-amber-400" /> Edit Website Nickname
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Set a friendly nickname for {activeSite?.url}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditNickname} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Nickname</label>
              <Input
                type="text"
                placeholder="e.g. Main Production App"
                value={editNickname}
                onChange={(e) => {
                  setEditNickname(e.target.value)
                  setEditNicknameError('')
                }}
                className={`bg-slate-900 border-slate-800 text-sm ${
                  editNicknameError ? 'border-red-500' : 'focus:border-emerald-500'
                }`}
                autoFocus
              />
              {editNicknameError && <p className="text-xs text-red-400 mt-1">{editNicknameError}</p>}
            </div>

            <DialogFooter className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete <span className="text-slate-200 font-bold">{activeSite?.nickname || activeSite?.url}</span>?
              All historical audit scan reports for this property will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteSite}
              disabled={actionLoading}
              className="bg-red-500 text-white font-bold hover:bg-red-600"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Permanently Delete
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </motion.div>
  )
}
