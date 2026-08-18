import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/toast'
import { supabase } from '../lib/supabaseClient'
import Sidebar from '../components/Sidebar'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import {
  Activity,
  Globe,
  TrendingUp,
  Play,
  Loader2,
  Calendar,
  FileText,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowUpDown,
  Filter,
  BarChart3,
  PieChart as PieIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedNumber from '../components/AnimatedNumber'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

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
  seo_score: number
  trust_score: number
  combined_score: number
  seo_report: {
    issues?: Array<{
      issue: string
      severity: string
      fix_suggestion: string
    }>
  } | null
  trust_report: {
    flags?: Array<{
      flag: string
      explanation: string
      priority?: string
      excerpt?: string | null
      reasoning?: string | null
    }>
  } | null
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

// Custom Tooltip Component for Recharts
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f172a]/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[140px]">
        <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="font-medium text-slate-400">{entry.name}:</span>
            </div>
            <span className="font-extrabold text-slate-100">{entry.value}%</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')

  const [sortField, setSortField] = useState<'nickname' | 'seo_score' | 'trust_score' | 'combined_score'>('nickname')
  const [sortAsc, setSortAsc] = useState(true)

  const getComparisonData = () => {
    const data = sites.map(site => {
      const scans = site.scans || []
      const latest = scans.length > 0
        ? [...scans].sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())[0]
        : null
      return {
        id: site.id,
        nickname: site.nickname || site.url.replace(/^https?:\/\//i, ''),
        url: site.url,
        seo_score: latest ? latest.seo_score : null,
        trust_score: latest ? latest.trust_score : null,
        combined_score: latest ? latest.combined_score : null
      }
    })

    return data.sort((a, b) => {
      let valA: any = a[sortField]
      let valB: any = b[sortField]

      if (valA === null || valA === undefined) return sortAsc ? 1 : -1
      if (valB === null || valB === undefined) return sortAsc ? -1 : 1

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
      } else {
        return sortAsc ? valA - valB : valB - valA
      }
    })
  }

  const handleSort = (field: 'nickname' | 'seo_score' | 'trust_score' | 'combined_score') => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  useEffect(() => {
    fetchSitesAndScans()
  }, [])

  const fetchSitesAndScans = async () => {
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
      setErrorMsg(err.message || 'Failed to load analytics data.')
      toast.error('Data Error', 'Failed to load analytics data.')
    } finally {
      setLoading(false)
    }
  }

  // Get active subset based on filter selection
  const filteredSites = selectedSiteId === 'all'
    ? sites
    : sites.filter(s => s.id === selectedSiteId)

  // Extract all scans from filtered sites
  const allScansInScope: Scan[] = []
  filteredSites.forEach(site => {
    if (site.scans) {
      allScansInScope.push(...site.scans)
    }
  })

  // Sort scans chronologically
  const sortedScans = [...allScansInScope].sort(
    (a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
  )

  const totalScans = allScansInScope.length
  const totalSites = filteredSites.length

  const avgCombined = totalScans > 0
    ? Math.round(allScansInScope.reduce((sum, s) => sum + (s.combined_score || 0), 0) / totalScans)
    : 0

  const mostRecentDate = totalScans > 0
    ? new Date(
        Math.max(...allScansInScope.map(s => new Date(s.scanned_at).getTime()))
      ).toLocaleDateString()
    : 'N/A'

  // Chart 1: Site Health Index Over Time
  const getLineChartData = () => {
    if (sortedScans.length === 0) return []

    const groups: Record<string, { sum: number; count: number }> = {}
    sortedScans.forEach(scan => {
      const dateStr = new Date(scan.scanned_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
      if (!groups[dateStr]) {
        groups[dateStr] = { sum: 0, count: 0 }
      }
      groups[dateStr].sum += scan.combined_score || 0
      groups[dateStr].count += 1
    })

    return Object.entries(groups).map(([date, val]) => ({
      date,
      Score: Math.round(val.sum / val.count),
    }))
  }

  // Chart 2: SEO vs Trust Score Comparison
  const getBarChartData = () => {
    if (selectedSiteId === 'all') {
      return sites.map(site => {
        const latestScan = site.scans && site.scans.length > 0
          ? [...site.scans].sort(
              (a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
            )[0]
          : null

        return {
          name: site.nickname || site.url.replace(/^https?:\/\//i, '').substring(0, 15),
          SEO: latestScan ? latestScan.seo_score : 0,
          Trust: latestScan ? latestScan.trust_score : 0,
        }
      }).filter(d => d.SEO > 0 || d.Trust > 0)
    } else {
      return sortedScans.map(scan => ({
        name: new Date(scan.scanned_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        SEO: scan.seo_score,
        Trust: scan.trust_score,
      }))
    }
  }

  // Chart 3: Flagged Issues Breakdown (Donut Chart)
  const getPieChartData = () => {
    let high = 0
    let medium = 0
    let low = 0

    allScansInScope.forEach(scan => {
      if (scan.seo_report && scan.seo_report.issues) {
        scan.seo_report.issues.forEach(issue => {
          const sev = (issue.severity || '').toLowerCase()
          if (sev === 'high') high++
          else if (sev === 'medium') medium++
          else low++
        })
      }

      if (scan.trust_report && scan.trust_report.flags) {
        high += scan.trust_report.flags.length
      }
    })

    return [
      { name: 'High Risk / Credibility', value: high, color: '#ef4444' },
      { name: 'Medium Severity', value: medium, color: '#f59e0b' },
      { name: 'Low / Informational', value: low, color: '#10b981' },
    ].filter(d => d.value > 0)
  }

  const lineChartData = getLineChartData()
  const barChartData = getBarChartData()
  const pieChartData = getPieChartData()

  const hasAnyScans = sites.some(s => s.scans && s.scans.length > 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col md:flex-row font-sans"
    >
      {/* SIDEBAR NAVIGATION */}
      <Sidebar activeTab="analytics" />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* HEADER & FILTER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-900/80">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
                Analytics
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Insights
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Aggregate health index metrics, technical SEO breakdowns, and trust score analytics.
              </p>
            </div>

            {/* SITE FILTER DROPDOWN */}
            <div className="relative shrink-0 w-full sm:w-64">
              <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                <Filter className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="w-full bg-transparent text-slate-200 outline-none cursor-pointer appearance-none text-xs font-semibold"
                >
                  <option value="all" className="bg-slate-900">All Websites ({sites.length})</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id} className="bg-slate-900">
                      {site.nickname || site.url.replace(/^https?:\/\//i, '')}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* STATUS BLOCK */}
          <AnimatePresence>
            {errorMsg && (
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

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
          ) : !hasAnyScans ? (
            /* EMPTY STATE */
            <div className="text-center py-20 border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/20 max-w-xl mx-auto px-6">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                <TrendingUp className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-200">No scan history recorded</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Once you run AI diagnostics on your properties, historical line trends, SEO vs Trust charts, and severity breakdowns will appear here.
              </p>
              <Button
                onClick={() => navigate('/dashboard')}
                className="mt-6 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 px-5 py-2.5 shadow-lg shadow-emerald-500/10 inline-flex items-center gap-2"
              >
                <Play className="h-4 w-4" /> Go to Sites & Run Scan
              </Button>
            </div>
          ) : (
            /* ANALYTICS CONTENT */
            <div className="space-y-8 animate-fade-in">
              
              {/* SUMMARY STAT CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/60 transition-colors">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Tracked Sites</span>
                    <Globe className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-100">
                      <AnimatedNumber value={totalSites} />
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Scope</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/60 transition-colors">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Total Audits</span>
                    <FileText className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-100">
                      <AnimatedNumber value={totalScans} />
                    </span>
                    <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded">
                      Scans
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/60 transition-colors">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Avg Combined Index</span>
                    <Activity className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-400">
                      <AnimatedNumber value={avgCombined} />
                      <span className="text-xs text-slate-500 font-normal">/100</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Health
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700/60 transition-colors">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Latest Audit Date</span>
                    <Calendar className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-sm font-bold text-slate-200 truncate">
                      {mostRecentDate}
                    </span>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                      Recent
                    </span>
                  </div>
                </div>
              </div>

              {/* CHARTS CONTAINER GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. HEALTH SCORE OVER TIME */}
                <Card className="bg-[#0b0f19] border-slate-800/80 text-slate-100 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-400" /> Site Health Index Over Time
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      {selectedSiteId === 'all'
                        ? 'Average combined health score timeline across all monitored properties.'
                        : 'Historical health index trend for the selected site.'
                      }
                    </CardDescription>
                  </CardHeader>
                  <div className="p-4 pt-2 h-[280px]">
                    {lineChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        Insufficient history data for line chart.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="Score"
                            name="Combined Score"
                            stroke="#10b981"
                            strokeWidth={3}
                            activeDot={{ r: 6, fill: '#10b981', stroke: '#070a12', strokeWidth: 2 }}
                            dot={{ r: 3, fill: '#10b981' }}
                            isAnimationActive={true}
                            animationDuration={800}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>

                {/* 2. SEO VS TRUST SCORE COMPARISON */}
                <Card className="bg-[#0b0f19] border-slate-800/80 text-slate-100 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-sky-400" /> Technical SEO vs Content Trust
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      {selectedSiteId === 'all'
                        ? 'Comparative SEO (emerald) and Trust (amber) scores per website.'
                        : 'SEO vs Content Trust scoring over time.'
                      }
                    </CardDescription>
                  </CardHeader>
                  <div className="p-4 pt-2 h-[280px]">
                    {barChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        No comparative bar chart data.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                          <Bar dataKey="SEO" fill="#10b981" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={800} />
                          <Bar dataKey="Trust" fill="#f59e0b" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={800} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>

                {/* 3. FLAGGED ISSUES SEVERITY BREAKDOWN */}
                <Card className="bg-[#0b0f19] border-slate-800/80 text-slate-100 rounded-2xl overflow-hidden lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
                      <PieIcon className="h-4 w-4 text-amber-400" /> Flagged Audit Issues Severity Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Total count of SEO structural issues and copy credibility warnings categorized by risk impact.
                    </CardDescription>
                  </CardHeader>
                  <div className="p-6 pt-0 flex flex-col md:flex-row items-center justify-center gap-8 min-h-[220px]">
                    {pieChartData.length === 0 ? (
                      <div className="h-[180px] w-full flex items-center justify-center text-xs text-slate-500">
                        No issues or trust flags recorded across monitored properties. All clear!
                      </div>
                    ) : (
                      <>
                        <div className="w-full md:w-1/2 h-[200px] shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={4}
                                dataKey="value"
                                isAnimationActive={true}
                                animationDuration={800}
                              >
                                {pieChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomChartTooltip />} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="w-full md:w-1/2 space-y-3">
                          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-amber-400" /> Issue Distribution
                          </p>
                          {pieChartData.map((entry, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-900/60 border border-slate-800/80"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="text-slate-200 font-medium">{entry.name}</span>
                              </div>
                              <span className="font-extrabold text-slate-100 bg-slate-800 px-2.5 py-1 rounded-md text-xs">
                                {entry.value} {entry.value === 1 ? 'issue' : 'issues'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </Card>

              </div>

              {/* SITE COMPARISON TABLE */}
              <Card className="bg-[#0b0f19] border-slate-800/80 text-slate-100 rounded-2xl overflow-hidden mt-8">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-slate-200">Site Performance Comparison Directory</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Sortable table listing all monitored domains and their latest SEO & Trust indexes.
                  </CardDescription>
                </CardHeader>

                <div className="px-6 pb-6 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-slate-400 font-semibold uppercase tracking-wider select-none bg-slate-900/40">
                        <th
                          onClick={() => handleSort('nickname')}
                          className="py-3 px-4 cursor-pointer hover:text-slate-200 transition-colors rounded-l-lg"
                        >
                          <div className="flex items-center gap-1.5">
                            Site Domain / Nickname
                            {sortField === 'nickname' ? (
                              sortAsc ? <ChevronUp className="h-3.5 w-3.5 text-emerald-400" /> : <ChevronDown className="h-3.5 w-3.5 text-emerald-400" />
                            ) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('seo_score')}
                          className="py-3 px-4 cursor-pointer hover:text-slate-200 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            SEO Score
                            {sortField === 'seo_score' ? (
                              sortAsc ? <ChevronUp className="h-3.5 w-3.5 text-emerald-400" /> : <ChevronDown className="h-3.5 w-3.5 text-emerald-400" />
                            ) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('trust_score')}
                          className="py-3 px-4 cursor-pointer hover:text-slate-200 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            Trust Score
                            {sortField === 'trust_score' ? (
                              sortAsc ? <ChevronUp className="h-3.5 w-3.5 text-emerald-400" /> : <ChevronDown className="h-3.5 w-3.5 text-emerald-400" />
                            ) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('combined_score')}
                          className="py-3 px-4 cursor-pointer hover:text-slate-200 transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            Combined Score
                            {sortField === 'combined_score' ? (
                              sortAsc ? <ChevronUp className="h-3.5 w-3.5 text-emerald-400" /> : <ChevronDown className="h-3.5 w-3.5 text-emerald-400" />
                            ) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-right rounded-r-lg">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300">
                      {getComparisonData().map((item) => {
                        return (
                          <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-slate-200">
                              <div>
                                <p className="font-bold text-slate-200">{item.nickname}</p>
                                <p className="text-[11px] text-slate-400 truncate max-w-xs">{item.url}</p>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-semibold">
                              {item.seo_score !== null ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-extrabold">
                                  {item.seo_score}%
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No data</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 font-semibold">
                              {item.trust_score !== null ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-extrabold">
                                  {item.trust_score}%
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No data</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 font-bold">
                              {item.combined_score !== null ? (
                                <span className="text-slate-100 font-black text-sm">
                                  {item.combined_score}/100
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">No data</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <Button
                                onClick={() => navigate(`/dashboard/sites/${item.id}`)}
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs border-slate-800 hover:bg-slate-800 hover:text-slate-100 font-bold"
                              >
                                View Details
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

            </div>
          )}

        </div>
      </main>

    </motion.div>
  )
}
