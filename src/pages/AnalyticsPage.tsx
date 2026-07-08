import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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
} from 'lucide-react'
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

export default function AnalyticsPage() {
  useAuth()
  const navigate = useNavigate()

  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')

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

  // Calculate Average Combined Score
  const avgCombined = totalScans > 0
    ? Math.round(allScansInScope.reduce((sum, s) => sum + (s.combined_score || 0), 0) / totalScans)
    : 0

  // Calculate Most Recent Scan Date
  const mostRecentDate = totalScans > 0
    ? new Date(
        Math.max(...allScansInScope.map(s => new Date(s.scanned_at).getTime()))
      ).toLocaleDateString()
    : 'N/A'

  // Chart 1: Site Health Index Over Time
  // Resolves aggregate average by date if "All Sites", or specific timeline if single site.
  // Grouping by date YYYY-MM-DD makes dates clean.
  const getLineChartData = () => {
    if (sortedScans.length === 0) return []

    // Group by date string
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
      // Comparison across sites (using latest scan for each site)
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
      // For a specific site: show SEO vs Trust over time
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
      // SEO Issues count by severity
      if (scan.seo_report && scan.seo_report.issues) {
        scan.seo_report.issues.forEach(issue => {
          const sev = (issue.severity || '').toLowerCase()
          if (sev === 'high') high++
          else if (sev === 'medium') medium++
          else low++
        })
      }

      // Trust flags are credibility concerns and are always classified as critical/high impact.
      if (scan.trust_report && scan.trust_report.flags) {
        high += scan.trust_report.flags.length
      }
    })

    return [
      { name: 'High Risk (SEO High + Credibility)', value: high, color: '#ef4444' }, // Red
      { name: 'Medium Severity', value: medium, color: '#f59e0b' }, // Amber
      { name: 'Low/Informational', value: low, color: '#10b981' }, // Mint-teal
    ].filter(d => d.value > 0)
  }

  const lineChartData = getLineChartData()
  const barChartData = getBarChartData()
  const pieChartData = getPieChartData()

  const hasAnyScans = sites.some(s => s.scans && s.scans.length > 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <Sidebar activeTab="analytics" />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* HEADER & FILTER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">Analytics</h1>
              <p className="text-sm text-slate-400 mt-1">Diagnostic summaries and comparative indicators.</p>
            </div>
            
            {/* SITE FILTER DROPDOWN */}
            <div className="relative shrink-0 w-full sm:w-64">
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none"
              >
                <option value="all">All Websites</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>
                    {site.nickname || site.url.replace(/^https?:\/\//i, '')}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* STATUS BLOCK */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
          ) : !hasAnyScans ? (
            /* EMPTY STATE */
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 max-w-xl mx-auto">
              <TrendingUp className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-300">No scan history found</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                Once you run a health scan on your properties, the diagnostic trends, comparison metrics, and severity analyses will appear here.
              </p>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="mt-6 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 inline-flex items-center gap-2"
              >
                <Play className="h-3.5 w-3.5" /> Go to My Sites to scan
              </Button>
            </div>
          ) : (
            /* ANALYTICS CONTENT */
            <div className="space-y-8 animate-fade-in">
              
              {/* SUMMARY STAT CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-slate-900/40 border-slate-800 text-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tracked Sites</p>
                    <Globe className="h-4 w-4 text-slate-650" />
                  </div>
                  <p className="text-2xl font-extrabold mt-2 text-slate-200">
                    {totalSites}
                  </p>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800 text-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Scans</p>
                    <FileText className="h-4 w-4 text-slate-650" />
                  </div>
                  <p className="text-2xl font-extrabold mt-2 text-slate-200">
                    {totalScans}
                  </p>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800 text-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Index</p>
                    <Activity className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-extrabold mt-2 text-emerald-400">
                    {avgCombined}%
                  </p>
                </Card>
                <Card className="bg-slate-900/40 border-slate-800 text-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Latest Scan</p>
                    <Calendar className="h-4 w-4 text-slate-650" />
                  </div>
                  <p className="text-sm font-bold mt-3 text-slate-300 truncate">
                    {mostRecentDate}
                  </p>
                </Card>
              </div>

              {/* CHARTS CONTAINER GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. HEALTH SCORE OVER TIME */}
                <Card className="bg-slate-900/30 border-slate-800 text-slate-100">
                  <CardHeader>
                    <CardTitle className="text-md font-bold text-slate-200">Site Health Index Over Time</CardTitle>
                    <CardDescription className="text-xs text-slate-550">
                      {selectedSiteId === 'all'
                        ? 'Average combined health score across all websites.'
                        : 'Combined score history for the selected website.'
                      }
                    </CardDescription>
                  </CardHeader>
                  <div className="p-4 pt-0 h-[300px]">
                    {lineChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        Insufficient history data.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                          <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                            itemStyle={{ color: '#10b981' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Score" 
                            stroke="#10b981" 
                            strokeWidth={3} 
                            activeDot={{ r: 6 }} 
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>

                {/* 2. SEO VS TRUST SCORE COMPARISON */}
                <Card className="bg-slate-900/30 border-slate-800 text-slate-100">
                  <CardHeader>
                    <CardTitle className="text-md font-bold text-slate-200">SEO vs Content Trust Comparison</CardTitle>
                    <CardDescription className="text-xs text-slate-550">
                      {selectedSiteId === 'all'
                        ? 'Latest SEO (mint) and Content Trust (amber) scores per site.'
                        : 'SEO vs Trust scoring trend over time.'
                      }
                    </CardDescription>
                  </CardHeader>
                  <div className="p-4 pt-0 h-[300px]">
                    {barChartData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        No scan comparison data.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                          <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                          <Bar dataKey="SEO" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Trust" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </Card>

                {/* 3. FLAGGED ISSUES SEVERITY BREAKDOWN */}
                <Card className="bg-slate-900/30 border-slate-800 text-slate-100 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-md font-bold text-slate-200">Flagged Issues Breakdown</CardTitle>
                    <CardDescription className="text-xs text-slate-550">
                      Total count of SEO issues and Trust alerts categorized by risk severity in current scope.
                    </CardDescription>
                  </CardHeader>
                  <div className="p-6 pt-0 flex flex-col md:flex-row items-center justify-center gap-8 h-auto min-h-[250px]">
                    {pieChartData.length === 0 ? (
                      <div className="h-[200px] w-full flex items-center justify-center text-xs text-slate-500">
                        No issues or trust flags recorded. Good job!
                      </div>
                    ) : (
                      <>
                        <div className="w-full md:w-1/2 h-[220px] shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {pieChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="w-full md:w-1/2 space-y-3">
                          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold mb-2">
                            <ShieldAlert className="h-4 w-4 text-slate-500" /> Key Issue Categories
                          </div>
                          {pieChartData.map((entry, index) => (
                            <div key={index} className="flex items-center justify-between text-xs p-2.5 rounded bg-slate-950/40 border border-slate-900">
                              <div className="flex items-center gap-2.5">
                                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="text-slate-300 font-medium truncate max-w-[200px] md:max-w-xs">{entry.name}</span>
                              </div>
                              <span className="font-extrabold text-slate-100 bg-slate-800 px-2 py-0.5 rounded text-[10px] shrink-0">
                                {entry.value} issues
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </Card>

              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  )
}
