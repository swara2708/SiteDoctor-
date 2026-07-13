import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Activity, ShieldAlert, Eye, TrendingUp, ArrowRight, CheckCircle2, Loader2,
  ChevronDown, Globe, Search, FileText, Shield, BarChart3, Zap, Download,
  Star, AlertTriangle, Image as ImageIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedNumber from '../components/AnimatedNumber'

// ─── FAQ DATA ───────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'What exactly does SiteDoctor+ scan?',
    a: 'SiteDoctor+ fetches your page\'s raw HTML and runs two parallel analysis pipelines: (1) a technical SEO audit covering meta tags, heading hierarchy, canonical links, Open Graph, mobile-friendliness, security headers, and page speed signals; and (2) an AI trust audit powered by Groq LLMs that reads your copywriting and flags AI-generated phrasing, unsubstantiated claims, thin content, and credibility gaps.',
  },
  {
    q: 'Is the AI content analysis accurate?',
    a: 'Our trust engine uses Groq\'s llama-3 family of models — the same class used in enterprise content-moderation pipelines. It provides flagged excerpts and reasoning for every issue it raises, so you can verify each finding. No automated system is 100% infallible, but our models are calibrated to minimise false positives.',
  },
  {
    q: 'How long does a scan take?',
    a: 'A typical full-page scan completes in 15–45 seconds. This includes fetching HTML, running the SEO audit, processing each image with vision AI, and completing the trust LLM call. Pages with many high-resolution images may take slightly longer.',
  },
  {
    q: 'Do I need to install anything on my website?',
    a: 'No. SiteDoctor+ is fully external — it works like a search engine crawler, fetching your publicly accessible URL from our servers. No script tags, plugins, or server-side access are required.',
  },
  {
    q: 'Can I track changes over time?',
    a: 'Yes. Every scan is stored in your dashboard with a full timestamp. The Scan History tab on each site\'s detail page shows SEO, Trust, and Combined scores for every past run. The Analytics page plots trend lines across all your websites.',
  },
  {
    q: 'What is the "Combined Score" or "Site Health Index"?',
    a: 'The Health Index is a weighted average of your SEO score (40%) and Trust score (60%). We weight trust higher because content credibility has become a primary ranking signal for modern search engines like Google\'s Helpful Content system.',
  },
  {
    q: 'Does SiteDoctor+ support multiple websites?',
    a: 'Yes. You can add unlimited websites to your dashboard, each with its own scan history, analytics trend, and PDF export. There is no hard cap on the number of URLs you can monitor.',
  },
  {
    q: 'Can I export my audit results?',
    a: 'Absolutely. Every scan has a "Download PDF" button that generates a comprehensive audit report including scores, letter grades, all SEO category breakdowns, trust flags with excerpts, image analysis logs, keyword table, content freshness score, and a prioritised action list.',
  },
]

// ─── STAT COUNTER ITEM ──────────────────────────────────────
function StatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
        <AnimatedNumber value={value} />{suffix}
      </div>
      <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1 uppercase tracking-wider">{label}</p>
    </div>
  )
}

// ─── FAQ ACCORDION ──────────────────────────────────────────
function FAQItem({ q, a, isOpen, onClick }: { q: string; a: string; isOpen: boolean; onClick: () => void }) {
  return (
    <motion.div
      className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/30 hover:border-slate-700/80 transition-colors duration-200"
      layout
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-slate-200">{q}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-emerald-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-4">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── PIPELINE STEP ──────────────────────────────────────────
function PipelineStep({
  step, icon: Icon, title, desc, color, delay
}: {
  step: string; icon: any; title: string; desc: string; color: 'emerald' | 'amber'; delay: number
}) {
  const isEmerald = color === 'emerald'
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay }}
      className={`flex flex-col items-center text-center p-6 rounded-2xl border relative overflow-hidden group
        ${isEmerald
          ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
          : 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
        } transition-all duration-300`}
    >
      {/* Step number watermark */}
      <span className={`text-7xl font-black absolute -top-3 -left-1 select-none pointer-events-none
        ${isEmerald ? 'text-emerald-500/10' : 'text-amber-500/10'}`}>
        {step}
      </span>

      {/* Icon ring */}
      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 z-10 group-hover:scale-110 transition-transform duration-300
        ${isEmerald ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
        <Icon className="h-7 w-7" />
      </div>

      <h3 className="text-base font-bold mb-2 z-10">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed z-10">{desc}</p>
    </motion.div>
  )
}

// ─── MINI SCORE CARD ────────────────────────────────────────
function MiniScoreCard({ label, score, grade, gradeColor, icon: Icon, iconColor }: {
  label: string; score: number; grade: string;
  gradeColor: string; icon: any; iconColor: string
}) {
  const radius = 28
  const circ = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ
  return (
    <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="relative shrink-0">
        <svg width="72" height="72" className="-rotate-90">
          <circle cx="36" cy="36" r={radius} stroke="#1e293b" strokeWidth="5" fill="none" />
          <motion.circle
            cx="36" cy="36" r={radius} stroke="currentColor"
            className={iconColor}
            strokeWidth="5" fill="none"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            whileInView={{ strokeDashoffset: offset }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: 'easeOut' }}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-200">{score}</span>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        </div>
        <span className={`text-xl font-black ${gradeColor}`}>{grade}</span>
        <p className="text-[10px] text-slate-500 mt-0.5">Letter Grade</p>
      </div>
    </div>
  )
}

// ─── APP PREVIEW TABS ───────────────────────────────────────
const PREVIEW_TABS = [
  {
    id: 'dashboard',
    label: 'My Websites',
    desc: 'Track all your websites in one place. Score rings show SEO, Trust, and Site Health at a glance.',
    img: '/ss_dashboard.png',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    desc: 'View trend charts and cross-site comparisons. Spot which sites need attention before rankings drop.',
    img: '/ss_analytics.png',
  },
  {
    id: 'detail',
    label: 'Audit Report',
    desc: 'Drill into full SEO, Trust, and Image audit results for any site. Download a PDF in one click.',
    img: '/ss_site_detail.png',
  },
]

function AppPreviewTabs() {
  const [active, setActive] = useState('dashboard')
  const current = PREVIEW_TABS.find(t => t.id === active)!

  return (
    <div>
      {/* Tab pills */}
      <div className="flex justify-center gap-2 mb-8 flex-wrap">
        {PREVIEW_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${
              active === tab.id
                ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-lg shadow-emerald-500/20'
                : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Screenshot frame */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="max-w-5xl mx-auto"
        >
          {/* Browser chrome bar */}
          <div className="bg-slate-800 rounded-t-xl px-4 py-2.5 flex items-center gap-2 border border-slate-700 border-b-0">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <div className="flex-1 mx-4 bg-slate-900 rounded-md px-3 py-1 text-[11px] text-slate-500 font-mono text-center">
              app.sitedoctor-plus.vercel.app
            </div>
          </div>

          {/* Screenshot */}
          <div className="border border-slate-700 border-t-0 rounded-b-xl overflow-hidden shadow-2xl shadow-black/60">
            <img
              src={current.img}
              alt={current.label}
              className="w-full object-cover object-top"
              style={{ maxHeight: '520px' }}
            />
          </div>

          {/* Caption */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-center text-sm text-slate-400 mt-5 max-w-xl mx-auto"
          >
            {current.desc}
          </motion.p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function LandingPage() {
  const [demoUrl, setDemoUrl] = useState('')
  const [demoState, setDemoState] = useState<'idle' | 'scanning' | 'completed'>('idle')
  const [scanStep, setScanStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const scanSteps = [
    'Initializing secure diagnostic scanner...',
    'Auditing meta tags and header hierarchies...',
    'Performing Groq AI content credibility scans...',
    'Analyzing visual asset compression & metadata...',
    'Compiling final health index scores...'
  ]

  useEffect(() => {
    let interval: any
    if (demoState === 'scanning') {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setDemoState('completed')
            return 100
          }
          const next = prev + 1.25
          const stepIndex = Math.min(Math.floor((next / 100) * scanSteps.length), scanSteps.length - 1)
          setScanStep(stepIndex)
          return next
        })
      }, 25)
    }
    return () => clearInterval(interval)
  }, [demoState])

  const handleDemoScan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!demoUrl.trim()) return
    setProgress(0)
    setScanStep(0)
    setDemoState('scanning')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300"
    >

      {/* 1. NAVBAR */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
              SiteDoctor+
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</a>
            <a href="#preview" className="hover:text-emerald-400 transition-colors">Preview</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
              Sign In
            </Link>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24">
        {/* Background glow effects */}
        <motion.div
          className="absolute top-1/4 left-1/2 -z-10 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px] sm:h-[400px] sm:w-[400px]"
          animate={{ scale: [1, 1.15, 0.9, 1], x: ['-50%', '-45%', '-55%', '-50%'], y: ['-50%', '-55%', '-45%', '-50%'] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 left-1/3 -z-10 h-[250px] w-[250px] rounded-full bg-amber-500/5 blur-[80px]"
          animate={{ scale: [1, 0.85, 1.15, 1], x: [0, 20, -15, 0], y: [0, -30, 25, 0] }}
          transition={{ duration: 16, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />

        <motion.div
          className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl"
          initial="hidden" animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
        >
          <motion.h1
            className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-100"
            variants={{ hidden: { opacity: 0, y: 25 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }}
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              SiteDoctor+
            </span>
            : AI-Powered Website SEO &amp; Content Credibility Scans
          </motion.h1>

          <motion.p
            className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }}
          >
            Scan your website in seconds to fix standard technical SEO issues, check the factual accuracy of your copywriting, and flag stock or low-quality images. We help you build a fast, reliable web presence that search engines and real users actually trust.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } }}
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:opacity-95" asChild>
                <Link to="/signup" className="inline-flex items-center justify-center gap-2">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full border-slate-800 text-slate-300 hover:bg-slate-900" asChild>
                <a href="#features">Explore Features</a>
              </Button>
            </motion.div>
          </motion.div>

          {/* INTERACTIVE DEMO SCANNER BOX */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-16 max-w-xl mx-auto p-5 rounded-2xl border border-slate-800/85 bg-slate-900/40 backdrop-blur-md shadow-2xl relative overflow-hidden text-left"
          >
            <div className="absolute inset-0 bg-emerald-500/[0.01] pointer-events-none" />

            {demoState === 'idle' && (
              <form onSubmit={handleDemoScan} className="space-y-4">
                <div className="text-left space-y-1">
                  <h3 className="text-xs font-black text-emerald-450 uppercase tracking-wider">Try SiteDoctor+ instantly</h3>
                  <p className="text-[11px] text-slate-400">Input a URL below to run a mock AI diagnostics audit right now.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url" required placeholder="https://example.com"
                    value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)}
                    className="flex-1 bg-slate-950/85 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-650 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
                  />
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button type="submit" className="w-full sm:w-auto bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs px-5 h-9">
                      Analyze URL
                    </Button>
                  </motion.div>
                </div>
              </form>
            )}

            {demoState === 'scanning' && (
              <div className="py-6 space-y-5 text-center">
                <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400 z-10" />
                  <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-md animate-ping" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-emerald-400 animate-pulse">{scanSteps[scanStep]}</p>
                  <div className="w-48 bg-slate-850 h-1 rounded-full mx-auto overflow-hidden">
                    <motion.div className="bg-emerald-400 h-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {demoState === 'completed' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }} className="space-y-5 text-left"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block">Demo Report</span>
                    <span className="text-xs font-mono text-slate-350 font-bold truncate max-w-xs block sm:inline">{demoUrl}</span>
                  </div>
                  <Button onClick={() => setDemoState('idle')} variant="ghost" className="h-7 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-800 px-3">
                    Reset
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1 bg-slate-950/20 border border-slate-850/50 rounded-xl p-3">
                  <DemoProgressRing value={88} label="SEO score" colorClass="stroke-emerald-400" />
                  <DemoProgressRing value={55} label="Trust score" colorClass="stroke-amber-500" />
                  <DemoProgressRing value={68} label="Health Index" colorClass="stroke-amber-400" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mock Diagnostics</span>
                  <div className="space-y-1.5">
                    <div className="bg-slate-950/40 border border-slate-850/60 rounded-lg p-2.5 flex items-start gap-2.5">
                      <span className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded border bg-red-500/10 text-red-400 border-red-500/20 shrink-0 mt-0.5">High</span>
                      <div>
                        <p className="text-[11px] font-bold text-slate-200">Missing descriptive Meta Description</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Fix: Add a descriptive meta tag between 150-160 characters long.</p>
                      </div>
                    </div>
                    <div className="bg-slate-950/40 border border-slate-850/60 rounded-lg p-2.5 flex items-start gap-2.5">
                      <span className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 shrink-0 mt-0.5">Medium</span>
                      <div>
                        <p className="text-[11px] font-bold text-slate-200">Deceptive/AI-generated text detected</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Fix: Rewrite generic introductions using a more authentic tone of voice.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-500 leading-normal">Sign up to run real scans and optimize your website live.</span>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto shrink-0">
                    <Button className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:opacity-95 text-xs px-4 h-8" asChild>
                      <Link to="/signup" className="inline-flex items-center gap-1.5">
                        Claim Your Free Account <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* ── SOCIAL PROOF STATS BAR ─────────────────────────── */}
      <section className="border-y border-slate-800/60 bg-slate-900/30 py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <StatItem value={12} suffix="+" label="SEO checks per scan" />
            <StatItem value={3} suffix="" label="AI models powering trust" />
            <StatItem value={100} suffix="%" label="external — no plugin needed" />
            <StatItem value={45} suffix="s" label="avg. scan completion time" />
          </motion.div>
        </div>
      </section>

      {/* 3. FEATURES SECTION */}
      <section id="features" className="py-20 border-t border-slate-900 bg-slate-950/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
              Key Features: Advanced Web Diagnostics
            </h2>
            <p className="mt-4 text-slate-400">
              Go beyond simple metadata. Run deep scans covering indexing health, content authenticity, and media metadata.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { Icon: Activity, color: 'emerald', title: 'SEO Vitals Scan', desc: 'Checks meta tag structure, page load performance, response latency, and mobile compatibility indicators.', delay: 0 },
              { Icon: ShieldAlert, color: 'amber', title: 'Trust Intelligence', desc: 'Scans copywriting for AI generation indices, evaluates clinical or factual claims, and flags deceptive content.', delay: 0.1 },
              { Icon: Eye, color: 'emerald', title: 'Image Verification', desc: 'Leverages Groq Vision integrations to detect stock imagery, inspect compression metrics, and highlight anomalies.', delay: 0.2 },
              { Icon: TrendingUp, color: 'amber', title: 'Analytics Panel', desc: 'Monitor indexing scoring trends, maintain verification logs, and toggle instant text notifications for server downtime.', delay: 0.3 },
            ].map(({ Icon, color, title, desc, delay }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5, delay }}
              >
                <Card className={`bg-slate-900/50 border-slate-800 text-slate-100 hover:border-${color}-500/50 transition-all duration-300 h-full group`}>
                  <CardHeader>
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 bg-${color}-500/10 group-hover:bg-${color}-500/20 transition-colors`}>
                      <Icon className={`h-6 w-6 text-${color}-400`} />
                    </div>
                    <CardTitle className="text-xl font-bold">
                      <h3 className="text-xl font-bold">{title}</h3>
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-sm mt-1">{desc}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ── SCORE VISUALIZER ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
          >
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 mb-3 block">Live Score Breakdown</span>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">
                Every metric has a letter grade
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                SiteDoctor+ doesn't just give you a number — it assigns a letter grade (A+ to F) to your SEO, Trust, and Combined scores, just like a school report card. Instantly know where you stand and what to fix first.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { grade: 'A+', range: '90–100', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
                  { grade: 'A', range: '80–89', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
                  { grade: 'B', range: '70–79', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
                  { grade: 'C', range: '60–69', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
                  { grade: 'D', range: '50–59', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
                  { grade: 'F', range: '< 50', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
                ].map(({ grade, range, color }) => (
                  <div key={grade} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold ${color}`}>
                    <span className="text-base">{grade}</span>
                    <span className="text-[10px] font-semibold opacity-70">{range}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <MiniScoreCard label="SEO Score" score={87} grade="A" gradeColor="text-emerald-400" icon={Search} iconColor="text-emerald-400" />
              <MiniScoreCard label="Trust Score" score={74} grade="B" gradeColor="text-amber-400" icon={Shield} iconColor="text-amber-400" />
              <MiniScoreCard label="Site Health Index" score={79} grade="B" gradeColor="text-amber-400" icon={BarChart3} iconColor="text-amber-400" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. HOW IT WORKS — VISUAL PIPELINE */}
      <section id="how-it-works" className="py-20 border-t border-slate-900 bg-slate-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
              How It Works: Scan Your Site in Minutes
            </h2>
            <p className="mt-4 text-slate-400">
              Our automated diagnostic pipeline processes URLs asynchronously to generate deep index charts.
            </p>
          </div>

          {/* Visual pipeline — 5 steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
            <PipelineStep step="01" icon={Globe} title="Add Your URL" desc="Register your domain in the dashboard and give it a nickname." color="emerald" delay={0} />

            {/* Arrow connector */}
            <div className="hidden lg:flex items-center justify-center">
              <motion.div
                className="h-0.5 w-full bg-gradient-to-r from-emerald-500/40 to-amber-500/40"
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
            </div>

            <PipelineStep step="02" icon={Search} title="SEO Audit" desc="We crawl your HTML and check 12+ technical SEO indicators instantly." color="emerald" delay={0.1} />

            <div className="hidden lg:flex items-center justify-center">
              <motion.div
                className="h-0.5 w-full bg-gradient-to-r from-emerald-500/40 to-amber-500/40"
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.35 }}
              />
            </div>

            <PipelineStep step="03" icon={FileText} title="AI Trust Scan" desc="Groq LLMs evaluate your copywriting for authenticity and credibility." color="amber" delay={0.2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch mt-4">
            <PipelineStep step="04" icon={ImageIcon} title="Vision Analysis" desc="Each image is checked for stock photo use, broken links, and quality." color="amber" delay={0.3} />

            <div className="hidden lg:flex items-center justify-center">
              <motion.div
                className="h-0.5 w-full bg-gradient-to-r from-amber-500/40 to-emerald-500/40"
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.5 }}
              />
            </div>

            <PipelineStep step="05" icon={Download} title="Export Report" desc="Download a full PDF audit with scores, grades, and prioritised fixes." color="emerald" delay={0.4} />

            <div className="hidden lg:flex items-center justify-center" />
            <div className="hidden lg:flex items-center justify-center" />
          </div>

          {/* What you get strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { icon: Zap, label: 'Quick Wins List', color: 'text-amber-400' },
              { icon: BarChart3, label: 'Keyword Analysis', color: 'text-emerald-400' },
              { icon: Star, label: 'Trust Sub-Scores', color: 'text-amber-400' },
              { icon: AlertTriangle, label: 'Priority Flags', color: 'text-red-400' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-3 bg-slate-900/40 border border-slate-800/60 rounded-xl px-4 py-3">
                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                <span className="text-xs font-semibold text-slate-300">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── APP PREVIEW SECTION ──────────────────────────────── */}
      <section id="preview" className="py-20 border-t border-slate-900 bg-slate-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-12"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 mb-3 block">See it in action</span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
              A Complete Audit Suite, All in One Place
            </h2>
            <p className="mt-4 text-slate-400">
              From score rings to AI trust flags — every page is designed for clarity and instant action.
            </p>
          </motion.div>

          <AppPreviewTabs />
        </div>
      </section>

      {/* 5. ABOUT SECTION */}
      <section id="about" className="py-20 border-t border-slate-900 bg-slate-950/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
              About SiteDoctor+
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              The modern standard for comprehensive website diagnostics.
            </p>
          </div>

          <div className="space-y-8 text-slate-300 leading-relaxed">
            <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <h3 className="text-xl font-semibold text-emerald-400 mb-3">Why SEO and Content Credibility Matter Together</h3>
              <p>
                In the modern digital landscape, a website's success is determined by more than just traditional search engine optimization (SEO) vitals. While fast load times, mobile friendliness, and proper meta tag structures are essential for climbing search rankings, the authenticity and credibility of your content are what retain visitors and build lasting trust. SiteDoctor+ was created to bridge this gap, offering a unified platform that scans websites for both technical performance and semantic integrity.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <h3 className="text-xl font-semibold text-amber-400 mb-3">Technical SEO Audits &amp; Semantic AI Verifications</h3>
              <p>
                Our advanced technical scanner analyzes crucial SEO metrics, including Core Web Vitals, site response latencies, security configurations, and semantic HTML structures. This ensures that search crawlers can index your website efficiently and rank it appropriately. At the same time, our state-of-the-art AI analysis engine inspects your copywriting for signs of automated text generation, evaluates claims against trusted databases, and alerts you to any copy that might be flagged as low-quality or untrustworthy by modern search engines.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <h3 className="text-xl font-semibold text-emerald-400 mb-3">Visual Asset &amp; Image Integrity Scans</h3>
              <p>
                Furthermore, SiteDoctor+ integrates vision intelligence powered by advanced AI models to review your website's visual assets. Images are analyzed for compression quality, stock media repetition, and potential AI manipulation, helping you maintain a consistent and credible brand voice. By combining technical vitals with deep semantic verification, SiteDoctor+ gives you a comprehensive health index of your web property, ensuring it is optimized for both search engines and human readers.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ──────────────────────────────────── */}
      <section id="pricing" className="py-20 border-t border-slate-900 bg-slate-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-14"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 mb-3 block">Simple pricing</span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
              Start Free. Scale When Ready.
            </h2>
            <p className="mt-4 text-slate-400">
              No credit card required to get started. Upgrade any time as your portfolio grows.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {/* FREE */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0 }}
              className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-8"
            >
              <div className="mb-6">
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Free</span>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-black text-slate-100">$0</span>
                  <span className="text-slate-500 mb-1">/month</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">Perfect for personal projects and learning the ropes.</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {[
                  'Up to 3 websites',
                  '10 scans per month',
                  'SEO Vitals Audit',
                  'AI Trust Analysis',
                  'Image Verification',
                  'Scan History (7 days)',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100" asChild>
                  <Link to="/signup">Get Started Free</Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* PRO — highlighted */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col rounded-2xl border-2 border-emerald-500/60 bg-emerald-500/5 p-8 relative shadow-xl shadow-emerald-500/10"
            >
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Pro</span>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-black text-slate-100">$9</span>
                  <span className="text-slate-400 mb-1">/month</span>
                </div>
                <p className="text-sm text-slate-400 mt-2">For freelancers and small agencies managing multiple client sites.</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {[
                  'Unlimited websites',
                  'Unlimited scans',
                  'Full SEO + Trust + Image AI',
                  'PDF Report Export',
                  'Email scan alerts',
                  'Scan History (90 days)',
                  'Google Search Preview',
                  'Keyword Extraction',
                  'Priority support',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:opacity-95" asChild>
                  <Link to="/signup">Start Pro Trial</Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* ENTERPRISE */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-8"
            >
              <div className="mb-6">
                <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">Enterprise</span>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-black text-slate-100">Custom</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">For agencies and teams that need white-labelling and advanced controls.</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {[
                  'Everything in Pro',
                  'White-label PDF reports',
                  'Team member access',
                  'API access',
                  'Custom scan scheduling',
                  'Dedicated account manager',
                  'SLA & uptime guarantee',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button variant="outline" className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10" asChild>
                  <a href="mailto:hello@sitedoctor.plus">Contact Us</a>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Guarantee strip */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center text-xs text-slate-500 mt-10"
          >
            🔒 No credit card required &nbsp;·&nbsp; Cancel any time &nbsp;·&nbsp; Secure checkout via Stripe
          </motion.p>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section id="faq" className="py-20 border-t border-slate-900 bg-slate-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 mb-3 block">Got questions?</span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-slate-400">
              Everything you need to know about SiteDoctor+ before you start scanning.
            </p>
          </motion.div>

          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {FAQ_ITEMS.map((item, i) => (
              <FAQItem
                key={i}
                q={item.q}
                a={item.a}
                isOpen={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </motion.div>

          {/* CTA below FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 text-center"
          >
            <p className="text-slate-400 mb-4">Still have questions? Just start scanning — it's free.</p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:opacity-95" asChild>
                <Link to="/signup" className="inline-flex items-center gap-2">
                  Start Your Free Scan <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-slate-500 text-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            &copy; {new Date().getFullYear()} SiteDoctor+. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-300 transition-colors">How It Works</a>
            <a href="#preview" className="hover:text-slate-300 transition-colors">Preview</a>
            <a href="#pricing" className="hover:text-slate-300 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-300 transition-colors">FAQ</a>
            <a href="#about" className="hover:text-slate-300 transition-colors">About</a>
            <Link to="/login" className="hover:text-slate-300 transition-colors">Login</Link>
            <Link to="/signup" className="hover:text-slate-300 transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>

    </motion.div>
  )
}

function DemoProgressRing({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center h-16 w-16">
        <svg className="absolute transform -rotate-90 w-16 h-16">
          <circle cx="32" cy="32" r={radius} className="stroke-slate-800" strokeWidth="3.5" fill="transparent" />
          <motion.circle
            cx="32" cy="32" r={radius} className={colorClass} strokeWidth="3.5" fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <span className="text-[12px] font-black text-slate-200">
          <AnimatedNumber value={value} />
        </span>
      </div>
      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mt-1">{label}</span>
    </div>
  )
}
