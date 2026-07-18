import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Check,
  ExternalLink,
  Play,
  Loader2,
  Tag,
  List,
  Gauge,
  Smartphone,
  FileText,
  Shield,
  Settings,
  Image as ImageIcon,
  Trophy,
  Activity,
  ChevronRight,
  Download,
  Monitor,
  Zap,
  Search,
  BarChart2,
  Globe,
  Users,
  Star,
  TrendingUp,
  Clock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
}

function ProgressRing({ value, label, type, size = 112 }: { value: number; label: string; type: 'seo' | 'trust' | 'combined'; size?: number }) {
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
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 relative group hover:border-slate-700/60 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
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
      <span className="absolute text-xl font-extrabold text-slate-100" style={{ top: 'calc(50% - 18px)' }}>
        <AnimatedNumber value={value} />
      </span>
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-2.5">{label}</span>
    </div>
  )
}

export default function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [site, setSite] = useState<Site | null>(null)
  const [scans, setScans] = useState<Scan[]>([])
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  
  const [errorMsg, setErrorMsg] = useState('')
  const [scanError, setScanError] = useState('')
  
  const [activeTab, setActiveTab] = useState<'overview' | 'seo' | 'trust' | 'image' | 'history'>('overview')
  const [addressedSuggestions, setAddressedSuggestions] = useState<Record<string, string[]>>({})
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')

  // Fetch site data & security verification
  const loadSiteAndScans = async () => {
    if (!user || !siteId) return
    setLoading(true)
    setErrorMsg('')
    try {
      // 1. Fetch site
      const { data: siteData, error: siteErr } = await (supabase.from('sites') as any)
        .select('*')
        .eq('id', siteId)
        .single()
      
      if (siteErr || !siteData) {
        throw new Error('Website not found or access denied.')
      }
      
      setSite(siteData)

      // 2. Fetch scans
      const { data: scanData, error: scanErr } = await (supabase.from('scans') as any)
        .select('*')
        .eq('site_id', siteId)
        .order('scanned_at', { ascending: false })
      
      if (scanErr) throw scanErr

      const scansList = scanData || []
      setScans(scansList)
      if (scansList.length > 0) {
        setSelectedScan(scansList[0])
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error loading website data.')
    } finally {
      setLoading(false)
    }
  }

  // Load user profile notification settings
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

  useEffect(() => {
    loadSiteAndScans()
    fetchUserProfile()
  }, [siteId, user])

  // Run new scan
  const handleScan = async () => {
    if (!site) return
    setScanning(true)
    setScanError('')
    
    const previousScan = selectedScan ? {
      combined_score: selectedScan.combined_score,
      seo_score: selectedScan.seo_score,
      trust_score: selectedScan.trust_score
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

      // Reload
      await loadSiteAndScans()
      setActiveTab('overview')
    } catch (err: any) {
      console.error(err)
      setScanError(err.message || 'Scanning process failed.')
    } finally {
      setScanning(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!site || !selectedScan) return
    setDownloadingPdf(true)
    setPdfError('')
    try {
      exportToPDF(site.nickname || site.url, site.url, selectedScan)
    } catch (err: any) {
      console.error('[SiteDoctor+] PDF generation error:', err)
      setPdfError(err.message || 'Failed to export PDF report. Please try again.')
      setTimeout(() => setPdfError(''), 5000)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const toggleSuggestion = (scanId: string, suggestionId: string) => {
    setAddressedSuggestions((prev) => {
      const currentList = prev[scanId] || []
      const newList = currentList.includes(suggestionId)
        ? currentList.filter((id) => id !== suggestionId)
        : [...currentList, suggestionId]
      return { ...prev, [scanId]: newList }
    })
  }

  // Derive reports for selected scan version
  const imgStats = selectedScan ? (() => {
    if (!selectedScan.image_flags || selectedScan.image_flags.length === 0) {
      return { total: 0, flagged: 0 }
    }
    const flagged = selectedScan.image_flags.filter(
      (img) => img.looks_like_stock_photo || img.quality_flag !== 'normal'
    ).length
    return { total: selectedScan.image_flags.length, flagged }
  })() : { total: 0, flagged: 0 }

  const suggestions = selectedScan ? (() => {
    const list: Array<{ 
      id: string; 
      type: 'SEO' | 'Trust' | 'Image'; 
      title: string; 
      fix: string; 
      priority: 'High' | 'Medium' | 'Low';
      excerpt?: string | null;
      reasoning?: string | null;
    }> = []
    
    // SEO
    const seoCategories = selectedScan.seo_report?.categories || []
    seoCategories.forEach((cat: any) => {
      if (imgStats.total === 0 && cat.category_name === 'Image Alt Text') return
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

    // Trust
    const trustFlags = selectedScan.trust_report?.flags || []
    trustFlags.forEach((flg: any, idx: number) => {
      list.push({
        id: `trust-${idx}-${flg.flag.replace(/\s+/g, '-').toLowerCase()}`,
        type: 'Trust',
        title: flg.flag,
        fix: flg.explanation ? `Recommendation: ${flg.explanation}` : 'Improve site trust indicator.',
        priority: flg.priority || 'Medium',
        excerpt: flg.excerpt || null,
        reasoning: flg.reasoning || null
      })
    })

    // Images
    const imageFlags = selectedScan.image_flags || []
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

    // Sort priority
    const priorityWeight = { High: 3, Medium: 2, Low: 1 }
    return list.sort((a, b) => {
      const weightA = priorityWeight[a.priority] || 2
      const weightB = priorityWeight[b.priority] || 2
      return weightB - weightA
    })
  })() : []

  const addressedList = selectedScan ? (addressedSuggestions[selectedScan.id] || []) : []

  // Icons mapper helper
  const getCategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('meta')) return <Tag className="h-4 w-4 text-emerald-400" />
    if (lowerName.includes('heading')) return <List className="h-4 w-4 text-emerald-400" />
    if (lowerName.includes('speed')) return <Gauge className="h-4 w-4 text-emerald-400" />
    if (lowerName.includes('mobile') || lowerName.includes('friend')) return <Smartphone className="h-4 w-4 text-emerald-400" />
    if (lowerName.includes('content') || lowerName.includes('quality')) return <FileText className="h-4 w-4 text-emerald-400" />
    if (lowerName.includes('security') || lowerName.includes('server')) return <Shield className="h-4 w-4 text-emerald-400" />
    if (lowerName.includes('advanced')) return <Settings className="h-4 w-4 text-emerald-400" />
    return <ImageIcon className="h-4 w-4 text-emerald-400" />
  }

  const getStatusStyles = (status: string) => {
    const val = (status || '').toLowerCase()
    if (val === 'good') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    if (val === 'critical') return 'bg-red-500/10 text-red-400 border-red-500/20'
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row font-sans"
    >
      <Sidebar activeTab="sites" />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* BACK TO DASHBOARD */}
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>

          {/* LOADING/ERROR STATES */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-slate-400 text-sm">Verifying access and loading diagnostics...</p>
            </div>
          ) : errorMsg ? (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-8 rounded-xl text-center space-y-4 max-w-md mx-auto">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
              <h3 className="text-lg font-bold">Access Error</h3>
              <p className="text-sm text-slate-400">{errorMsg}</p>
              <Button onClick={() => navigate('/dashboard')} className="bg-slate-800 text-slate-200 hover:bg-slate-700">
                Return to Safety
              </Button>
            </div>
          ) : !site ? null : (
            <>
              {/* HEADER DETAILS */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0b0f19] border border-slate-900/80 p-6 rounded-2xl">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-slate-100">
                    {site.nickname || site.url}
                  </h2>
                  <a 
                    href={site.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm text-slate-400 hover:text-emerald-400 inline-flex items-center gap-1 transition-colors"
                  >
                    {site.url} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {selectedScan && (
                    <div className="text-xs text-slate-500">
                      Loaded audit: {new Date(selectedScan.scanned_at).toLocaleString()}
                      {selectedScan.id !== scans[0]?.id && (
                        <span className="ml-2 text-amber-500/80 bg-amber-500/10 px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider text-[8px]">
                          Historical Version
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {selectedScan && (
                    <Button
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}
                      variant="outline"
                      className="border-slate-800 text-slate-300 hover:bg-slate-900 flex items-center gap-1.5 h-10 text-xs"
                    >
                      {downloadingPdf ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    onClick={handleScan}
                    disabled={scanning}
                    className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 flex items-center gap-1.5 shadow-md shadow-emerald-500/10 h-10"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scanning...
                      </>
                    ) : selectedScan ? (
                      <>
                        <Play className="h-3.5 w-3.5" /> Re-scan Site
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" /> Scan Now
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {pdfError && (
                <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{pdfError}</span>
                </div>
              )}

              {scanError && (
                <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{scanError}</span>
                </div>
              )}

              {/* RINGS + SCORE SUMMARY BAR */}
              {selectedScan && !scanning && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <ProgressRing value={selectedScan.seo_score || 0} label="SEO score" type="seo" />
                    <ProgressRing value={selectedScan.trust_score || 0} label="Trust Score" type="trust" />
                    <ProgressRing value={selectedScan.combined_score || 0} label="Site Health Index" type="combined" />
                  </div>

                  {/* Score Summary Bar */}
                  {(() => {
                    const cats = selectedScan.seo_report?.categories || []
                    const passed = cats.filter((c: any) => c.status?.toLowerCase() === 'good').length
                    const warnings = cats.filter((c: any) => c.status?.toLowerCase() === 'needs improvement').length
                    const failed = cats.filter((c: any) => c.status?.toLowerCase() === 'critical').length
                    if (cats.length === 0) return null
                    return (
                      <div className="flex items-center gap-3 bg-[#0b0f19] border border-slate-900/80 rounded-2xl px-5 py-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">Audit Summary</span>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          <span className="text-xs font-bold text-emerald-400">{passed}</span>
                          <span className="text-[10px] text-slate-500">Passed</span>
                        </div>
                        <div className="h-3 w-px bg-slate-800" />
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                          <span className="text-xs font-bold text-amber-400">{warnings}</span>
                          <span className="text-[10px] text-slate-500">Warnings</span>
                        </div>
                        <div className="h-3 w-px bg-slate-800" />
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-red-400"></span>
                          <span className="text-xs font-bold text-red-400">{failed}</span>
                          <span className="text-[10px] text-slate-500">Failed</span>
                        </div>
                        {/* Proportional bar */}
                        <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-slate-900 ml-2">
                          {passed > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(passed/cats.length)*100}%` }} />}
                          {warnings > 0 && <div className="bg-amber-500 h-full" style={{ width: `${(warnings/cats.length)*100}%` }} />}
                          {failed > 0 && <div className="bg-red-500 h-full" style={{ width: `${(failed/cats.length)*100}%` }} />}
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}

              {scanning && (
                <div className="grid grid-cols-1 gap-4 p-8 border border-dashed border-slate-800 bg-[#0b0f19]/50 rounded-2xl items-center text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
                  <h4 className="font-semibold text-slate-300">Auditing Content & SEO Elements...</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Retrieving raw HTML content, parsing tags structure, evaluating evolution logs, and completing AI audit validations.
                  </p>
                </div>
              )}

              {/* TABS CONTAINER */}
              {selectedScan && !scanning && (
                <div className="space-y-4">
                  {/* TABS BUTTONS (framer-motion slider effect) */}
                  <div className="flex border-b border-slate-900 overflow-x-auto scrollbar-none py-1 gap-1">
                    {[
                      { id: 'overview', label: 'Overview' },
                      { id: 'seo', label: 'SEO Report' },
                      { id: 'trust', label: 'Trust Report' },
                      { id: 'image', label: 'Image Analysis' },
                      { id: 'history', label: 'Scan History' },
                    ].map((tab) => {
                      const isActive = activeTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`relative px-4 py-2 text-xs font-bold transition-all duration-300 shrink-0 select-none ${
                            isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {isActive && (
                            <motion.div 
                              layoutId="activeTabIndicator"
                              className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-400"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                          {tab.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* TABS PAGES */}
                  <div className="pt-2">
                    <AnimatePresence mode="wait">
                      {activeTab === 'overview' && (
                        <motion.div
                          key="overview"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          {/* ACTIONABLE IMPROVEMENT TASKS */}
                          <Card className="bg-slate-900/20 border-slate-900 text-slate-200">
                            <CardHeader className="pb-4">
                              <CardTitle className="text-sm font-bold flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <AlertCircle className="h-4 w-4 text-amber-500" />
                                  Actionable Improvement Tasks
                                </span>
                                {suggestions.length > 0 && (
                                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                                    {addressedList.filter(id => suggestions.some(s => s.id === id)).length} of {suggestions.length} addressed
                                  </span>
                                )}
                              </CardTitle>
                              {suggestions.length > 0 && (
                                <div className="w-full bg-[#141b2b] h-2 rounded-full overflow-hidden mt-3">
                                  <div 
                                    className="bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-400 h-full transition-all duration-500" 
                                    style={{ 
                                      width: `${(addressedList.filter(id => suggestions.some(s => s.id === id)).length / suggestions.length) * 100}%` 
                                    }}
                                  />
                                </div>
                              )}
                            </CardHeader>

                            <div className="p-6 pt-0">
                              {suggestions.length === 0 ? (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 text-center space-y-3">
                                  <Trophy className="h-10 w-10 text-emerald-400 mx-auto animate-bounce" />
                                  <h4 className="font-bold text-emerald-400">Excellent SEO & Trust Health</h4>
                                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                    Our audit engine didn't discover any critical issues on this page. All settings are optimal!
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                  {suggestions.map((s) => {
                                    const isAddressed = addressedList.includes(s.id)
                                    const getPriorityStyles = (p: string) => {
                                      if (p === 'High') return 'bg-red-500/10 text-red-400 border-red-500/20'
                                      if (p === 'Medium') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      return 'bg-slate-850 text-slate-400 border-slate-800'
                                    }

                                    return (
                                      <motion.div 
                                        key={s.id}
                                        className={`bg-[#141b2b] border rounded-xl p-3.5 flex gap-3.5 transition-all duration-300 ${
                                          isAddressed 
                                            ? 'border-slate-905 opacity-50 line-through decoration-slate-600' 
                                            : 'border-slate-850/60 hover:border-slate-800'
                                        }`}
                                      >
                                        <button 
                                          onClick={() => toggleSuggestion(selectedScan.id, s.id)}
                                          className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                            isAddressed 
                                              ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                                              : 'border-slate-700 hover:border-slate-500 bg-transparent'
                                          }`}
                                        >
                                          {isAddressed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                        </button>

                                        <div className="flex-1 space-y-1.5 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded border ${getPriorityStyles(s.priority)}`}>
                                              {s.priority}
                                            </span>
                                            <span className="text-[9px] bg-slate-850 text-slate-400 font-semibold px-1.5 py-0.2 rounded">
                                              {s.type}
                                            </span>
                                          </div>
                                          
                                          <div className="text-xs font-bold text-slate-200 leading-snug">
                                            {s.title}
                                          </div>
                                          <div className="text-xs text-slate-400 leading-normal">
                                            {s.fix}
                                          </div>

                                          {s.type === 'Trust' && s.excerpt && (
                                            <div className="mt-2.5 p-3 bg-[#030712] border border-slate-900 rounded-lg text-xs space-y-2">
                                              <div>
                                                <span className="font-semibold text-[9px] text-emerald-400/80 uppercase tracking-wider block mb-0.5">Flagged Excerpt</span>
                                                <q className="italic text-slate-350">"{s.excerpt}"</q>
                                              </div>
                                              {s.reasoning && (
                                                <div>
                                                  <span className="font-semibold text-[9px] text-amber-400/80 uppercase tracking-wider block mb-0.5">AI Analysis reasoning</span>
                                                  <p className="text-slate-400 leading-relaxed">{s.reasoning}</p>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </motion.div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </Card>

                          {/* QUICK WINS CHECKLIST */}
                          {(() => {
                            const quickWins: string[] = selectedScan.seo_report?.quick_wins || []
                            if (quickWins.length === 0) return null
                            return (
                              <Card className="bg-slate-900/20 border-slate-900 text-slate-200">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                    <Zap className="h-4 w-4 text-amber-400" />
                                    Quick Wins
                                  </CardTitle>
                                  <CardDescription className="text-slate-500">
                                    Low-effort, high-impact improvements you can ship today.
                                  </CardDescription>
                                </CardHeader>
                                <div className="p-6 pt-0 space-y-2">
                                  {quickWins.map((win, idx) => (
                                    <div key={idx} className="flex items-start gap-2.5 bg-[#141b2b] border border-slate-900/80 rounded-lg px-3 py-2.5">
                                      <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                      <span className="text-xs text-slate-300 leading-relaxed">{win}</span>
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            )
                          })()}
                        </motion.div>
                      )}

                      {activeTab === 'seo' && (
                        <motion.div
                          key="seo"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          {/* GOOGLE SEARCH PREVIEW */}
                          {(() => {
                            // Extract meta info from first SEO category if meta category exists, or read from raw
                            const metaCat = (selectedScan.seo_report?.categories || []).find((c: any) =>
                              c.category_name?.toLowerCase().includes('meta')
                            )
                            const rawTitle = metaCat?.detected_title || site?.nickname || site?.url || 'Page Title'
                            const rawDesc = metaCat?.detected_description || metaCat?.explanation || 'No meta description detected for this page.'
                            const pageUrl = site?.url || ''
                            const displayUrl = pageUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')

                            const DESKTOP_TITLE_MAX = 600 // pixels ~60 chars
                            const MOBILE_TITLE_MAX = 55 // chars
                            const DESKTOP_DESC_MAX = 155
                            const MOBILE_DESC_MAX = 105

                            const truncate = (str: string, max: number) =>
                              str.length > max ? str.slice(0, max) + '…' : str

                            return (
                              <Card className="bg-[#0b0f19] border-slate-900/80 text-slate-200">
                                <CardHeader className="p-4 pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                      <Search className="h-4 w-4 text-slate-400" />
                                      Google Search Results Preview
                                    </CardTitle>
                                    <GooglePreviewToggle />
                                  </div>
                                  <CardDescription className="text-slate-500">
                                    Simulates how this page appears in Google search results.
                                  </CardDescription>
                                </CardHeader>
                                <div className="px-4 pb-5">
                                  <GooglePreviewPanel
                                    title={rawTitle}
                                    description={rawDesc}
                                    displayUrl={displayUrl}
                                    truncate={truncate}
                                    desktopTitleMax={DESKTOP_TITLE_MAX}
                                    desktopDescMax={DESKTOP_DESC_MAX}
                                    mobileTitleMax={MOBILE_TITLE_MAX}
                                    mobileDescMax={MOBILE_DESC_MAX}
                                  />
                                </div>
                              </Card>
                            )
                          })()}

                          {/* SEO CATEGORY CARDS */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                              const rawCategories = selectedScan.seo_report?.categories || []
                              const categories = imgStats.total === 0 
                                ? rawCategories.filter((cat: any) => cat.category_name !== 'Image Alt Text')
                                : rawCategories

                              if (categories.length === 0) {
                                return (
                                  <p className="text-xs text-slate-500 italic text-center col-span-2 py-8">
                                    No detailed categories available.
                                  </p>
                                )
                              }

                              return categories.map((cat: any) => (
                                <Card key={cat.category_name} className="bg-[#0b0f19] border-slate-900/80 text-slate-200 hover:-translate-y-0.5 transition-all duration-300">
                                  <CardHeader className="p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        {getCategoryIcon(cat.category_name)}
                                        <span className="text-xs font-bold text-slate-200">{cat.category_name}</span>
                                      </div>
                                      <span className={`px-2 py-0.2 rounded border text-[9px] font-extrabold uppercase tracking-wide ${getStatusStyles(cat.status)}`}>
                                        {cat.status}
                                      </span>
                                    </div>
                                    
                                    <p className="text-xs text-slate-400 leading-normal">
                                      {cat.explanation}
                                    </p>
                                    
                                    {cat.fix_suggestion && cat.fix_suggestion !== 'None required.' && (
                                      <div className="bg-[#141b2b] border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-355">
                                        <span className="font-semibold text-[9px] text-amber-400/80 uppercase tracking-wider block mb-0.5">Recommended Fix</span>
                                        {cat.fix_suggestion}
                                      </div>
                                    )}
                                  </CardHeader>
                                </Card>
                              ))
                            })()}
                          </div>

                          {/* KEYWORD EXTRACTION TABLE */}
                          {(() => {
                            const keywords: Array<{ keyword: string; frequency: number; relevance: string }> =
                              selectedScan.seo_report?.top_keywords || []
                            if (keywords.length === 0) return null
                            return (
                              <Card className="bg-[#0b0f19] border-slate-900/80 text-slate-200">
                                <CardHeader className="p-4 pb-3">
                                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                    <BarChart2 className="h-4 w-4 text-emerald-400" />
                                    Top Keywords Detected
                                  </CardTitle>
                                  <CardDescription className="text-slate-500">
                                    Most prominent terms extracted from the page content.
                                  </CardDescription>
                                </CardHeader>
                                <div className="px-4 pb-4 overflow-x-auto">
                                  <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                      <tr className="border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                        <th className="py-2 pr-4">#</th>
                                        <th className="py-2 pr-4">Keyword</th>
                                        <th className="py-2 pr-4 text-center">Frequency</th>
                                        <th className="py-2">Relevance</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {keywords.map((kw, i) => (
                                        <tr key={i} className="border-b border-slate-900/60 hover:bg-[#141b2b]/50 transition-colors">
                                          <td className="py-2 pr-4 text-slate-600 font-mono">{i + 1}</td>
                                          <td className="py-2 pr-4 font-semibold text-slate-200">{kw.keyword}</td>
                                          <td className="py-2 pr-4 text-center">
                                            <span className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded font-mono">{kw.frequency}x</span>
                                          </td>
                                          <td className="py-2">
                                            <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${
                                              kw.relevance?.toLowerCase() === 'high'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : kw.relevance?.toLowerCase() === 'medium'
                                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                : 'bg-slate-800 text-slate-400 border-slate-700'
                                            }`}>{kw.relevance || 'Low'}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </Card>
                            )
                          })()}
                        </motion.div>
                      )}

                      {activeTab === 'trust' && (
                        <motion.div
                          key="trust"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          {/* DOMAIN BUSINESS CONTEXT */}
                          {(() => {
                            const ctx = selectedScan.trust_report?.business_context
                            if (!ctx) return null
                            return (
                              <Card className="bg-[#0b0f19] border-slate-900/80 text-slate-200">
                                <CardHeader className="p-4 pb-3">
                                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                    <Globe className="h-4 w-4 text-emerald-400" />
                                    About This Site
                                  </CardTitle>
                                </CardHeader>
                                <div className="px-4 pb-4 space-y-3">
                                  {ctx.what_is_this_domain_about && (
                                    <p className="text-xs text-slate-300 leading-relaxed">{ctx.what_is_this_domain_about}</p>
                                  )}
                                  <div className="flex flex-wrap gap-2">
                                    {ctx.industry_niche && (
                                      <span className="flex items-center gap-1.5 text-[10px] font-semibold bg-slate-900 border border-slate-800 rounded-full px-3 py-1 text-slate-300">
                                        <BarChart2 className="h-3 w-3 text-emerald-400" />
                                        {ctx.industry_niche}
                                      </span>
                                    )}
                                    {ctx.target_audience && (
                                      <span className="flex items-center gap-1.5 text-[10px] font-semibold bg-slate-900 border border-slate-800 rounded-full px-3 py-1 text-slate-300">
                                        <Users className="h-3 w-3 text-amber-400" />
                                        {ctx.target_audience}
                                      </span>
                                    )}
                                    {ctx.content_tone && (
                                      <span className="flex items-center gap-1.5 text-[10px] font-semibold bg-slate-900 border border-slate-800 rounded-full px-3 py-1 text-slate-300">
                                        <FileText className="h-3 w-3 text-blue-400" />
                                        {ctx.content_tone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            )
                          })()}

                          {/* TRUST SUB-METRICS */}
                          {(() => {
                            const sub = selectedScan.trust_report?.trust_sub_scores
                            if (!sub) return null
                            const metrics = [
                              { label: 'Topical Relevance', value: sub.topical_relevance || 0, color: 'bg-emerald-500' },
                              { label: 'Subject Expertise', value: sub.subject_expertise || 0, color: 'bg-blue-500' },
                              { label: 'Credibility', value: sub.credibility || 0, color: 'bg-amber-500' },
                            ]
                            return (
                              <Card className="bg-[#0b0f19] border-slate-900/80 text-slate-200">
                                <CardHeader className="p-4 pb-3">
                                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                    <Star className="h-4 w-4 text-amber-400" />
                                    Trust Sub-Metrics
                                  </CardTitle>
                                  <CardDescription className="text-slate-500">Granular breakdown of the trust score components.</CardDescription>
                                </CardHeader>
                                <div className="px-4 pb-4 space-y-3">
                                  {metrics.map((m) => (
                                    <div key={m.label}>
                                      <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-slate-400 font-semibold">{m.label}</span>
                                        <span className="text-slate-200 font-bold font-mono">{m.value}<span className="text-slate-500">/100</span></span>
                                      </div>
                                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                                        <motion.div
                                          className={`h-full rounded-full ${m.color}`}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${m.value}%` }}
                                          transition={{ duration: 0.8, ease: 'easeOut' }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            )
                          })()}

                          {/* CONTENT FRESHNESS */}
                          {(() => {
                            const freshness = selectedScan.trust_report?.content_freshness
                            if (!freshness) return null
                            const score = freshness.score || 0
                            const radius = 36
                            const circ = 2 * Math.PI * radius
                            const offset = circ - (score / 100) * circ
                            const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'
                            const signals: string[] = freshness.signals || []
                            return (
                              <Card className="bg-[#0b0f19] border-slate-900/80 text-slate-200">
                                <CardHeader className="p-4 pb-3">
                                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    Content Freshness
                                  </CardTitle>
                                </CardHeader>
                                <div className="px-4 pb-4 flex items-start gap-6">
                                  {/* Mini ring */}
                                  <div className="relative shrink-0">
                                    <svg width="90" height="90" className="-rotate-90">
                                      <circle cx="45" cy="45" r={radius} stroke="#1e293b" strokeWidth="8" fill="none" />
                                      <motion.circle
                                        cx="45" cy="45" r={radius}
                                        stroke={scoreColor}
                                        strokeWidth="8"
                                        fill="none"
                                        strokeDasharray={circ}
                                        initial={{ strokeDashoffset: circ }}
                                        animate={{ strokeDashoffset: offset }}
                                        transition={{ duration: 0.9, ease: 'easeOut' }}
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold" style={{ color: scoreColor }}>{score}</span>
                                  </div>
                                  <div className="space-y-2 flex-1">
                                    <p className="text-xs text-slate-400 leading-relaxed">{freshness.assessment || ''}</p>
                                    {signals.length > 0 && (
                                      <div className="space-y-1.5">
                                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Signals Detected</span>
                                        {signals.map((sig, i) => (
                                          <div key={i} className="flex items-start gap-1.5">
                                            <TrendingUp className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                                            <span className="text-[11px] text-slate-300">{sig}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            )
                          })()}

                          {/* CONTENT STRENGTHS & WEAKNESSES */}
                          {(() => {
                            const strengths: string[] = selectedScan.trust_report?.content_strengths || []
                            const weaknesses: string[] = selectedScan.trust_report?.content_weaknesses || []
                            if (strengths.length === 0 && weaknesses.length === 0) return null
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {strengths.length > 0 && (
                                  <Card className="bg-[#0b0f19] border-emerald-500/10 text-slate-200">
                                    <CardHeader className="p-4 pb-2">
                                      <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                                        <Check className="h-3.5 w-3.5" /> Content Strengths
                                      </CardTitle>
                                    </CardHeader>
                                    <div className="px-4 pb-4 space-y-2">
                                      {strengths.map((s, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                          <Check className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                                          <span className="text-xs text-slate-300 leading-relaxed">{s}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </Card>
                                )}
                                {weaknesses.length > 0 && (
                                  <Card className="bg-[#0b0f19] border-red-500/10 text-slate-200">
                                    <CardHeader className="p-4 pb-2">
                                      <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-red-400">
                                        <AlertTriangle className="h-3.5 w-3.5" /> Content Weaknesses
                                      </CardTitle>
                                    </CardHeader>
                                    <div className="px-4 pb-4 space-y-2">
                                      {weaknesses.map((w, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                          <AlertTriangle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                                          <span className="text-xs text-slate-300 leading-relaxed">{w}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </Card>
                                )}
                              </div>
                            )
                          })()}

                          {/* CREDIBILITY FLAGS */}
                          <Card className="bg-slate-900/20 border-slate-900 text-slate-200">
                            <CardHeader>
                              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                <Shield className="h-4 w-4 text-emerald-400" />
                                Credibility & Trust Indicators
                              </CardTitle>
                              <CardDescription className="text-slate-500">
                                Checks verifying copywriting parameters, entity verification indicators, and AI presence flags.
                              </CardDescription>
                            </CardHeader>
                            
                            <div className="p-6 pt-0 space-y-4">
                              {(() => {
                                const flags = selectedScan.trust_report?.flags || []
                                if (flags.length === 0 || (flags.length === 1 && flags[0].flag === 'No flags raised')) {
                                  return (
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 text-center space-y-3">
                                      <Shield className="h-10 w-10 text-emerald-400 mx-auto" />
                                      <h4 className="font-bold text-emerald-400">Excellent Credibility Score</h4>
                                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                        No credibility flags, thin content parameters, or suspicious copy structures were flagged on this page.
                                      </p>
                                    </div>
                                  )
                                }

                                return flags.map((flg: any, idx: number) => (
                                  <div key={idx} className="bg-[#141b2b] border border-slate-900/80 rounded-xl p-4 space-y-3">
                                    <div className="flex justify-between items-start gap-2">
                                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        {flg.flag}
                                      </h4>
                                      <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">
                                        {flg.priority || 'Medium'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-normal">{flg.explanation}</p>
                                    {flg.excerpt && (
                                      <div className="p-3 bg-[#030712] border border-slate-900/80 rounded-lg text-xs space-y-1.5">
                                        <span className="font-semibold text-[9px] text-emerald-400/80 uppercase tracking-wider block">Flagged Excerpt</span>
                                        <q className="italic text-slate-300">"{flg.excerpt}"</q>
                                      </div>
                                    )}
                                    {flg.reasoning && (
                                      <div className="p-3 bg-[#030712] border border-slate-900/80 rounded-lg text-xs space-y-1.5">
                                        <span className="font-semibold text-[9px] text-amber-400/80 uppercase tracking-wider block">Reasoning Details</span>
                                        <p className="text-slate-450 leading-relaxed">{flg.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                ))
                              })()}
                            </div>
                          </Card>
                        </motion.div>
                      )}

                      {activeTab === 'image' && (
                        <motion.div
                          key="image"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          <Card className="bg-slate-900/20 border-slate-900 text-slate-200">
                            <CardHeader>
                              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                <ImageIcon className="h-4 w-4 text-slate-400" />
                                Image Quality & Relevance analysis
                              </CardTitle>
                              <CardDescription className="text-slate-500">
                                Audited stock photo parameters, resolution parameters, and broken paths.
                              </CardDescription>
                            </CardHeader>

                            <div className="p-6 pt-0">
                              {imgStats.total === 0 ? (
                                <div className="text-xs text-slate-500 italic text-center py-6">
                                  No images found on this page — image analysis was skipped.
                                </div>
                              ) : (
                                <div className="space-y-4 divide-y divide-slate-900">
                                  {selectedScan.image_flags?.map((img, idx) => (
                                    <div key={idx} className="pt-4 first:pt-0 flex gap-4 items-start">
                                      <div className="relative shrink-0">
                                        {img.quality_flag === 'broken' ? (
                                          <div className="w-16 h-16 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center text-xs text-red-500 font-bold">
                                            ERR
                                          </div>
                                        ) : (
                                          <img 
                                            src={img.image_url} 
                                            alt="Page Asset" 
                                            className="w-16 h-16 object-cover rounded-xl border border-slate-855"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>'
                                            }}
                                          />
                                        )}
                                      </div>

                                      <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                            img.looks_like_stock_photo 
                                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                              : 'bg-slate-855 text-slate-400'
                                          }`}>
                                            {img.looks_like_stock_photo ? 'Stock Photo' : 'Authentic'}
                                          </span>
                                          
                                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                            img.quality_flag !== 'normal' 
                                              ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          }`}>
                                            {img.quality_flag}
                                          </span>
                                        </div>

                                        {img.reasoning && (
                                          <p className="text-xs text-slate-350 leading-relaxed mt-1">
                                            {img.reasoning}
                                          </p>
                                        )}
                                        {img.relevance_note && (
                                          <p className="text-xs text-slate-500 leading-relaxed italic">
                                            {img.relevance_note}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      )}

                      {activeTab === 'history' && (
                        <motion.div
                          key="history"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          <Card className="bg-slate-900/20 border-slate-900 text-slate-200">
                            <CardHeader>
                              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                <Activity className="h-4 w-4 text-emerald-400" />
                                Audit log history
                              </CardTitle>
                              <CardDescription className="text-slate-500">
                                Click any past record row to load that version's full category cards and suggestions.
                              </CardDescription>
                            </CardHeader>
                            
                            <div className="p-6 pt-0 overflow-x-auto">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                                    <th className="py-2.5 px-3">Date Scanned</th>
                                    <th className="py-2.5 px-3 text-center">SEO Score</th>
                                    <th className="py-2.5 px-3 text-center">Trust Score</th>
                                    <th className="py-2.5 px-3 text-center">Combined</th>
                                    <th className="py-2.5 px-3 text-right">View</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {scans.map((s) => {
                                    const isSelected = selectedScan.id === s.id
                                    return (
                                      <tr 
                                        key={s.id}
                                        onClick={() => setSelectedScan(s)}
                                        className={`border-b border-slate-900/60 hover:bg-[#141b2b]/40 cursor-pointer transition-colors ${
                                          isSelected ? 'bg-[#141b2b] text-emerald-400 font-semibold' : 'text-slate-300'
                                        }`}
                                      >
                                        <td className="py-3 px-3">
                                          {new Date(s.scanned_at).toLocaleString()}
                                          {s.id === scans[0]?.id && (
                                            <span className="ml-2 text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded font-extrabold uppercase">
                                              latest
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-3 px-3 text-center font-semibold">{s.seo_score}</td>
                                        <td className="py-3 px-3 text-center font-semibold">{s.trust_score}</td>
                                        <td className="py-3 px-3 text-center font-bold">{s.combined_score}</td>
                                        <td className="py-3 px-3 text-right">
                                          <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${isSelected ? 'translate-x-1 text-emerald-400' : 'text-slate-600'}`} />
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </Card>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </motion.div>
  )
}

// ──────────────────────────────────────────────
// Google Search Preview sub-components
// ──────────────────────────────────────────────
function GooglePreviewToggle() {
  // Stateless UI — parent GooglePreviewPanel reads the toggle from a shared context approach.
  // We lift the toggle state to the parent via a simple exported store-less approach: just render inline.
  return null // toggle rendered inline inside GooglePreviewPanel
}

function GooglePreviewPanel({
  title, description, displayUrl, truncate,
  desktopTitleMax, desktopDescMax, mobileTitleMax, mobileDescMax
}: {
  title: string; description: string; displayUrl: string
  truncate: (s: string, n: number) => string
  desktopTitleMax: number; desktopDescMax: number; mobileTitleMax: number; mobileDescMax: number
}) {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop')

  const dTitle = truncate(title, desktopTitleMax)
  const dDesc = truncate(description, desktopDescMax)
  const mTitle = truncate(title, mobileTitleMax)
  const mDesc = truncate(description, mobileDescMax)

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex gap-1 bg-slate-950/60 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView('desktop')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
            view === 'desktop' ? 'bg-slate-800 text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Monitor className="h-3 w-3" /> Desktop
        </button>
        <button
          onClick={() => setView('mobile')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
            view === 'mobile' ? 'bg-slate-800 text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Smartphone className="h-3 w-3" /> Mobile
        </button>
      </div>

      {/* Preview card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className={`bg-white rounded-xl p-4 ${
            view === 'mobile' ? 'max-w-xs' : 'max-w-lg'
          }`}
        >
          {/* Favicon + breadcrumb */}
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-4 w-4 bg-slate-300 rounded-full flex items-center justify-center text-[8px] text-slate-600 font-bold">G</div>
            <div>
              <div className="text-[11px] text-gray-600 leading-none">{displayUrl}</div>
              <div className="text-[9px] text-gray-500 leading-none">› ...</div>
            </div>
          </div>
          {/* Title */}
          <div className={`font-medium text-blue-700 hover:underline cursor-pointer leading-snug ${
            view === 'mobile' ? 'text-sm' : 'text-base'
          }`}>
            {view === 'desktop' ? dTitle : mTitle}
          </div>
          {/* Description */}
          <div className={`text-gray-600 leading-snug mt-0.5 ${
            view === 'mobile' ? 'text-[11px]' : 'text-xs'
          }`}>
            {view === 'desktop' ? dDesc : mDesc}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
