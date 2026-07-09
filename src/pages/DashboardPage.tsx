import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
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
  FileText,
  Activity,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  ChevronDown,
  Tag,
  List,
  Gauge,
  Smartphone,
  Trophy,
  Check,
} from 'lucide-react'

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
    <div className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 relative group hover:border-slate-700/60 transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/5">
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {/* Center number */}
      <span className="absolute text-[13px] font-extrabold text-slate-100" style={{ top: 'calc(50% - 14px)' }}>
        {value}
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

  // Addressed suggestions tracking mapped per scanId
  const [addressedSuggestions, setAddressedSuggestions] = useState<Record<string, string[]>>({})

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

  const toggleSuggestion = (scanId: string, suggestionId: string) => {
    console.log(`[SiteDoctor+ Debug] Toggling suggestion checkbox: scanId=${scanId}, suggestionId=${suggestionId}`);
    setAddressedSuggestions((prev) => {
      const currentList = prev[scanId] || []
      const newList = currentList.includes(suggestionId)
        ? currentList.filter((id) => id !== suggestionId)
        : [...currentList, suggestionId]
      console.log(`[SiteDoctor+ Debug] Updated addressed suggestions for scanId=${scanId}:`, newList);
      return { ...prev, [scanId]: newList }
    })
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


  // Helper to compute flags count
  const getImageFlagsStats = (scan: Scan) => {
    if (!scan.image_flags || scan.image_flags.length === 0) {
      return { total: 0, flagged: 0 }
    }
    const flagged = scan.image_flags.filter(
      (img) => img.looks_like_stock_photo || img.quality_flag !== 'normal'
    ).length
    return { total: scan.image_flags.length, flagged }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
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
          {errorMsg && !isAddOpen && !isEditOpen && !isDeleteOpen && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          {/* SITES GRID LIST */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((n) => (
                <div key={n} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6 animate-pulse">
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
                </div>
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
              {sites.map((site) => {
                const latestScan = getLatestScan(site)
                const isScanning = !!scanningSites[site.id]
                const scanError = scanErrors[site.id]
                const imgStats = latestScan ? getImageFlagsStats(latestScan) : { total: 0, flagged: 0 }

                const suggestions = latestScan ? (() => {
                  const list: Array<{ id: string; type: 'SEO' | 'Trust' | 'Image'; title: string; fix: string; priority: 'High' | 'Medium' | 'Low' }> = []
                  
                  // 1. SEO report suggestions
                  const seoCategories = latestScan.seo_report?.categories || []
                  seoCategories.forEach((cat: any) => {
                    // Skip Image Alt Text suggestions if there are no images on the page
                    if (imgStats.total === 0 && cat.category_name === 'Image Alt Text') {
                      return
                    }
                    if (cat.status === 'Needs Improvement' || cat.status === 'Critical') {
                      list.push({
                        id: `seo-${cat.category_name}`,
                        type: 'SEO',
                        title: `${cat.category_name}: ${cat.explanation}`,
                        fix: cat.fix_suggestion,
                        priority: cat.priority || 'Medium'
                      })
                    }
                  })

                  // 2. Trust report suggestions
                  const trustFlags = latestScan.trust_report?.flags || []
                  trustFlags.forEach((flg: any, idx: number) => {
                    list.push({
                      id: `trust-${idx}-${flg.flag.replace(/\s+/g, '-').toLowerCase()}`,
                      type: 'Trust',
                      title: flg.flag,
                      fix: flg.explanation ? `Recommendation: ${flg.explanation}` : 'Improve site trust indicator.',
                      priority: flg.priority || 'Medium'
                    })
                  })

                  // 3. Image suggestions
                  const imageFlags = latestScan.image_flags || []
                  imageFlags.forEach((img: any, idx: number) => {
                    const imgUrl = img.image_url || ''
                    const displayUrl = imgUrl.length > 45 ? imgUrl.substring(0, 45) + '...' : imgUrl
                    if (img.quality_flag === 'broken') {
                      list.push({
                        id: `img-broken-${idx}`,
                        type: 'Image',
                        title: `Image failed to load: ${displayUrl}`,
                        fix: 'This image failed to load. Replace it with a valid asset.',
                        priority: 'High'
                      })
                    }
                    if (img.looks_like_stock_photo) {
                      list.push({
                        id: `img-stock-${idx}`,
                        type: 'Image',
                        title: `Stock photo detected: ${displayUrl}`,
                        fix: 'Replace this image with authentic, custom photography to build trust.',
                        priority: 'Medium'
                      })
                    }
                    if (img.quality_flag === 'low-resolution') {
                      list.push({
                        id: `img-low-res-${idx}`,
                        type: 'Image',
                        title: `Low resolution image: ${displayUrl}`,
                        fix: 'Replace this image with a higher resolution version.',
                        priority: 'Medium'
                      })
                    }
                    if (img.quality_flag === 'placeholder') {
                      list.push({
                        id: `img-placeholder-${idx}`,
                        type: 'Image',
                        title: `Placeholder image: ${displayUrl}`,
                        fix: 'Replace this placeholder with actual, custom content.',
                        priority: 'Medium'
                      })
                    }
                  })

                  // Sort priority: High -> Medium -> Low
                  const priorityWeight = { High: 3, Medium: 2, Low: 1 }
                  return list.sort((a, b) => {
                    const weightA = priorityWeight[a.priority] || 2
                    const weightB = priorityWeight[b.priority] || 2
                    return weightB - weightA
                  })
                })() : []

                const addressedList = latestScan ? (addressedSuggestions[latestScan.id] || []) : []

                return (
                  <Card key={site.id} className="bg-slate-900/50 border-slate-800 text-slate-100 hover:border-slate-700/80 transition-all flex flex-col justify-between">
                    <CardHeader className="pb-4">
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

                      {/* Display Suggestions to Improve Your Website */}
                      {latestScan && !isScanning && (
                        <div className="mt-4 pt-4 border-t border-slate-800/40">
                          <h4 className="text-xs font-bold text-slate-400 flex items-center justify-between mb-2 px-1">
                            <span className="flex items-center gap-1.5 font-bold">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                              Suggestions to Improve
                            </span>
                            {suggestions.length > 0 && (
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                                {addressedList.filter(id => suggestions.some(s => s.id === id)).length} of {suggestions.length} addressed
                              </span>
                            )}
                          </h4>

                          {suggestions.length > 0 && (
                            <div className="w-full bg-slate-850 h-1.5 rounded-full mb-3 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-500" 
                                style={{ 
                                  width: `${(addressedList.filter(id => suggestions.some(s => s.id === id)).length / suggestions.length) * 100}%` 
                                }}
                              />
                            </div>
                          )}

                          {suggestions.length === 0 ? (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2.5">
                              <Trophy className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                              <div className="text-[11px] text-emerald-400/90 leading-normal">
                                <span className="font-bold block text-emerald-400 mb-0.5">Great job! No major issues found.</span>
                                Your site meets excellent SEO and Trust standards.
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                              {suggestions.map((s) => {
                                const isAddressed = addressedList.includes(s.id)
                                
                                const getPriorityStyles = (p: string) => {
                                  if (p === 'High') return 'bg-red-500/10 text-red-400 border-red-500/20'
                                  if (p === 'Medium') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  return 'bg-slate-800 text-slate-400 border-slate-700/50'
                                }

                                return (
                                  <div 
                                    key={s.id}
                                    className={`bg-slate-950/30 border rounded-lg p-2.5 flex gap-2.5 transition-all duration-300 ${
                                      isAddressed 
                                        ? 'border-slate-800/40 opacity-55 line-through decoration-slate-600' 
                                        : 'border-slate-850 hover:border-slate-800'
                                    }`}
                                  >
                                    <button 
                                      onClick={() => toggleSuggestion(latestScan.id, s.id)}
                                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                        isAddressed 
                                          ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                                          : 'border-slate-700 hover:border-slate-500 bg-transparent'
                                      }`}
                                      aria-label={isAddressed ? "Mark as uncompleted" : "Mark as completed"}
                                    >
                                      {isAddressed && <Check className="h-3 w-3 stroke-[3]" />}
                                    </button>

                                    <div className="flex-1 space-y-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded border ${getPriorityStyles(s.priority)}`}>
                                          {s.priority}
                                        </span>
                                        <span className="text-[9px] bg-slate-800 text-slate-400 font-semibold px-1 rounded-sm">
                                          {s.type}
                                        </span>
                                      </div>
                                      
                                      <div className="text-[11px] font-bold text-slate-200 leading-snug">
                                        {s.title}
                                      </div>
                                      <div className="text-[10px] text-slate-400 leading-normal">
                                        {s.fix}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Display SEO Health Breakdown list */}
                      {latestScan && !isScanning && (
                        <div className="mt-3 border border-slate-800 rounded bg-slate-950/40 text-xs">
                          <details className="group">
                            <summary className="px-3 py-2 cursor-pointer font-semibold text-slate-400 select-none flex items-center justify-between hover:text-slate-200">
                              <span className="flex items-center gap-1.5">
                                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                                SEO Health Breakdown
                              </span>
                              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180 text-slate-500" />
                            </summary>
                            
                            <div className="px-3 pb-3 pt-1 border-t border-slate-800/60 mt-1 grid grid-cols-1 gap-2.5 max-h-[350px] overflow-y-auto">
                              {(() => {
                                const rawCategories = latestScan.seo_report?.categories || []
                                const categories = imgStats.total === 0 
                                  ? rawCategories.filter((cat: any) => cat.category_name !== 'Image Alt Text')
                                  : rawCategories
                                
                                const getCategoryIcon = (name: string) => {
                                  const lowerName = name.toLowerCase()
                                  if (lowerName.includes('meta')) return <Tag className="h-3.5 w-3.5 text-emerald-400" />
                                  if (lowerName.includes('heading')) return <List className="h-3.5 w-3.5 text-emerald-400" />
                                  if (lowerName.includes('speed')) return <Gauge className="h-3.5 w-3.5 text-emerald-400" />
                                  if (lowerName.includes('mobile') || lowerName.includes('friend')) return <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                                  if (lowerName.includes('content') || lowerName.includes('quality')) return <FileText className="h-3.5 w-3.5 text-emerald-400" />
                                  return <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />
                                }

                                const getStatusStyles = (status: string) => {
                                  const val = (status || '').toLowerCase()
                                  if (val === 'good') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  if (val === 'critical') return 'bg-red-500/10 text-red-400 border-red-500/20'
                                  return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }

                                if (categories.length === 0) {
                                  return (
                                    <p className="text-[11px] text-slate-500 italic text-center py-2">
                                      No detailed SEO breakdown available for this scan version.
                                    </p>
                                  )
                                }

                                return categories.map((cat: any, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className="bg-slate-900/40 border border-slate-850/80 rounded-lg p-2.5 space-y-1.5 hover:-translate-y-0.5 hover:shadow hover:shadow-emerald-500/5 hover:border-slate-800/80 transition-all duration-300"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        {getCategoryIcon(cat.category_name)}
                                        <span className="text-[11px] font-bold text-slate-300">{cat.category_name}</span>
                                      </div>
                                      <span className={`px-1.5 py-0.2 rounded border text-[8px] font-extrabold uppercase tracking-wide ${getStatusStyles(cat.status)}`}>
                                        {cat.status}
                                      </span>
                                    </div>
                                    
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                      {cat.explanation}
                                    </p>
                                    
                                    {cat.fix_suggestion && cat.fix_suggestion !== 'None required.' && (
                                      <div className="bg-slate-950/40 border border-slate-850/40 rounded p-1.5 text-[10px] text-slate-350">
                                        <span className="font-semibold text-[9px] text-amber-400/80 uppercase tracking-wider block mb-0.5">Recommended Fix</span>
                                        {cat.fix_suggestion}
                                      </div>
                                    )}
                                  </div>
                                ))
                              })()}
                            </div>
                          </details>
                        </div>
                      )}

                      {/* Display Image Flags list */}
                      {latestScan && !isScanning && (
                        <div className="mt-3">
                          {imgStats.total === 0 ? (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 px-1 py-0.5">
                              <ImageIcon className="h-3.5 w-3.5" /> No images found on this page — image analysis skipped.
                            </div>
                          ) : (
                            <details className="group border border-slate-800 rounded bg-slate-950/40 text-xs">
                              <summary className="px-3 py-2 cursor-pointer font-semibold text-slate-400 select-none flex items-center justify-between hover:text-slate-200">
                                <span className="flex items-center gap-1.5">
                                  <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                                  Image Flags ({imgStats.flagged} of {imgStats.total} flagged)
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180 text-slate-500" />
                              </summary>
                              
                              <div className="px-3 pb-3 pt-1 border-t border-slate-800/60 space-y-3 divide-y divide-slate-800/40">
                                {latestScan.image_flags?.map((img, idx) => {

                                  return (
                                    <div key={idx} className={`pt-2 first:pt-0 flex gap-3 items-start`}>
                                      <div className="relative shrink-0">
                                        {img.quality_flag === 'broken' ? (
                                          <div className="w-10 h-10 rounded border border-slate-800 bg-slate-900 flex items-center justify-center text-[10px] text-red-500 font-bold">
                                            ERR
                                          </div>
                                        ) : (
                                          <img 
                                            src={img.image_url} 
                                            alt="Scanned page" 
                                            className="w-10 h-10 object-cover rounded border border-slate-800"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>'
                                            }}
                                          />
                                        )}
                                      </div>

                                      <div className="space-y-0.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className={`text-[10px] px-1 py-0.2 rounded font-semibold ${
                                            img.looks_like_stock_photo 
                                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                              : 'bg-slate-800 text-slate-400'
                                          }`}>
                                            {img.looks_like_stock_photo ? 'Stock Photo' : 'Authentic'}
                                          </span>
                                          
                                          <span className={`text-[10px] px-1 py-0.2 rounded font-semibold ${
                                            img.quality_flag !== 'normal' 
                                              ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          }`}>
                                            {img.quality_flag}
                                          </span>
                                        </div>

                                        {img.reasoning && (
                                          <p className="text-[10px] text-slate-400 leading-normal mt-1">
                                            {img.reasoning}
                                          </p>
                                        )}
                                        {img.relevance_note && (
                                          <p className="text-[10px] text-slate-500 leading-normal italic">
                                            {img.relevance_note}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </details>
                          )}
                        </div>
                      )}

                      {/* Scan error display */}
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
                    
                    <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 flex items-center justify-between mt-auto">
                      {isScanning ? (
                        <div className="inline-flex items-center gap-2 text-slate-400 text-xs font-semibold py-1">
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                          Analyzing...
                        </div>
                      ) : !latestScan ? (
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-xs font-semibold">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          No scans yet
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">
                          Scan complete
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3">
                        <a 
                          href={site.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
                        >
                          Visit <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        
                        <Button
                          onClick={() => handleScan(site)}
                          disabled={isScanning}
                          className="h-8 text-xs bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 flex items-center gap-1.5"
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
                )
              })}
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

    </div>
  )
}
