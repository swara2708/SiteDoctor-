import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Activity, ShieldAlert, Eye, TrendingUp, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import AnimatedNumber from '../components/AnimatedNumber'

export default function LandingPage() {
  const [demoUrl, setDemoUrl] = useState('')
  const [demoState, setDemoState] = useState<'idle' | 'scanning' | 'completed'>('idle')
  const [scanStep, setScanStep] = useState(0)
  const [progress, setProgress] = useState(0)

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
            <a href="#about" className="hover:text-emerald-400 transition-colors">About</a>
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
        {/* Background glow effects - animated continuously */}
        <motion.div 
          className="absolute top-1/4 left-1/2 -z-10 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px] sm:h-[400px] sm:w-[400px]"
          animate={{
            scale: [1, 1.15, 0.9, 1],
            x: ['-50%', '-45%', '-55%', '-50%'],
            y: ['-50%', '-55%', '-45%', '-50%'],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
        <motion.div 
          className="absolute top-1/3 left-1/3 -z-10 h-[250px] w-[250px] rounded-full bg-amber-500/5 blur-[80px]"
          animate={{
            scale: [1, 0.85, 1.15, 1],
            x: [0, 20, -15, 0],
            y: [0, -30, 25, 0],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />

        <motion.div 
          className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15
              }
            }
          }}
        >
          <motion.h1 
            className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-100"
            variants={{
              hidden: { opacity: 0, y: 25 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              SiteDoctor+
            </span>
            : AI-Powered Website SEO &amp; Content Credibility Scans
          </motion.h1>
          
          <motion.p 
            className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
          >
            Analyze and optimize your website's performance. SiteDoctor+ evaluates your web properties through a double-lens: auditing standard technical SEO vitals while validating content truthfulness, factual accuracy, and image credibility using state-of-the-art AI models.
          </motion.p>

          <motion.div 
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
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
            {/* Ambient scanner glow */}
            <div className="absolute inset-0 bg-emerald-500/[0.01] pointer-events-none" />
            
            {demoState === 'idle' && (
              <form onSubmit={handleDemoScan} className="space-y-4">
                <div className="text-left space-y-1">
                  <h3 className="text-xs font-black text-emerald-450 uppercase tracking-wider">Try SiteDoctor+ instantly</h3>
                  <p className="text-[11px] text-slate-400">Input a URL below to run a mock AI diagnostics audit right now.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://example.com"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
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
                {/* Spinner & scanner sweep */}
                <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400 z-10" />
                  <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-md animate-ping" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs font-mono text-emerald-400 animate-pulse">
                    {scanSteps[scanStep]}
                  </p>
                  <div className="w-48 bg-slate-850 h-1 rounded-full mx-auto overflow-hidden">
                    <motion.div 
                      className="bg-emerald-400 h-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {demoState === 'completed' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-5 text-left"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider block">Demo Report</span>
                    <span className="text-xs font-mono text-slate-350 font-bold truncate max-w-xs block sm:inline">{demoUrl}</span>
                  </div>
                  <Button 
                    onClick={() => setDemoState('idle')}
                    variant="ghost" 
                    className="h-7 text-[10px] text-slate-400 hover:text-slate-200 border border-slate-800 px-3"
                  >
                    Reset
                  </Button>
                </div>

                {/* Progress Rings */}
                <div className="grid grid-cols-3 gap-2 py-1 bg-slate-950/20 border border-slate-850/50 rounded-xl p-3">
                  <DemoProgressRing value={88} label="SEO score" colorClass="stroke-emerald-400" />
                  <DemoProgressRing value={55} label="Trust score" colorClass="stroke-amber-500" />
                  <DemoProgressRing value={68} label="Health Index" colorClass="stroke-amber-400" />
                </div>

                {/* Suggestions List */}
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

      {/* 3. FEATURES SECTION */}
      <section id="features" className="py-16 border-t border-slate-900 bg-slate-950/50">
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
            
            {/* SEO Health Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 text-slate-100 hover:border-emerald-500/50 transition-all duration-300 h-full">
                <CardHeader>
                  <Activity className="h-10 w-10 text-emerald-400 mb-3" />
                  <CardTitle className="text-xl font-bold">
                    <h3 className="text-xl font-bold">SEO Vitals Scan</h3>
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm mt-1">
                    Checks meta tag structure, page load performance, response latency, and mobile compatibility indicators.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            {/* Trust and Credibility Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 text-slate-100 hover:border-amber-500/50 transition-all duration-300 h-full">
                <CardHeader>
                  <ShieldAlert className="h-10 w-10 text-amber-400 mb-3" />
                  <CardTitle className="text-xl font-bold">
                    <h3 className="text-xl font-bold">Trust Intelligence</h3>
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm mt-1">
                    Scans copywriting for AI generation indices, evaluates clinical or factual claims, and flags deceptive content.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            {/* Image Verification Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 text-slate-100 hover:border-emerald-500/50 transition-all duration-300 h-full">
                <CardHeader>
                  <Eye className="h-10 w-10 text-emerald-400 mb-3" />
                  <CardTitle className="text-xl font-bold">
                    <h3 className="text-xl font-bold">Image Verification</h3>
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm mt-1">
                    Leverages Groq Vision integrations to detect stock imagery, inspect compression metrics, and highlight anomalies.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

            {/* Analytics Dashboard Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 text-slate-100 hover:border-amber-500/50 transition-all duration-300 h-full">
                <CardHeader>
                  <TrendingUp className="h-10 w-10 text-amber-400 mb-3" />
                  <CardTitle className="text-xl font-bold">
                    <h3 className="text-xl font-bold">Analytics Panel</h3>
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm mt-1">
                    Monitor indexing scoring trends, maintain verification logs, and toggle instant text notifications for server downtime.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-16 border-t border-slate-900 bg-slate-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
              How It Works: Scan Your Site in Minutes
            </h2>
            <p className="mt-4 text-slate-400">
              Our automated diagnostic pipeline processes URLs asynchronously to generate deep index charts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0 }}
              className="flex flex-col items-center text-center p-6 bg-slate-900/30 rounded-xl border border-slate-800/60 relative"
            >
              <span className="text-5xl font-black bg-gradient-to-b from-emerald-500/30 to-transparent bg-clip-text text-transparent absolute top-3 left-4">
                01
              </span>
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 z-10">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Add Your URL</h3>
              <p className="text-sm text-slate-400">
                Register your domain name in the dashboard. Give it a nickname to coordinate scans across properties.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col items-center text-center p-6 bg-slate-900/30 rounded-xl border border-slate-800/60 relative"
            >
              <span className="text-5xl font-black bg-gradient-to-b from-amber-500/30 to-transparent bg-clip-text text-transparent absolute top-3 left-4">
                02
              </span>
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4 z-10">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Automated Diagnostic</h3>
              <p className="text-sm text-slate-400">
                SiteDoctor+ runs the SEO audits and processes textual pages using Large Language Models to check validity.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center text-center p-6 bg-slate-900/30 rounded-xl border border-slate-800/60 relative"
            >
              <span className="text-5xl font-black bg-gradient-to-b from-emerald-500/30 to-transparent bg-clip-text text-transparent absolute top-3 left-4">
                03
              </span>
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 z-10">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Review Site Health Index</h3>
              <p className="text-sm text-slate-400">
                Inspect structured scores and expand detailed issue lists with recommendations to fix errors.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 5. ABOUT SECTION */}
      <section id="about" className="py-16 border-t border-slate-900 bg-slate-950/50">
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
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-semibold text-emerald-400 mb-3">
                Why SEO and Content Credibility Matter Together
              </h3>
              <p>
                In the modern digital landscape, a website's success is determined by more than just traditional search engine optimization (SEO) vitals. While fast load times, mobile friendliness, and proper meta tag structures are essential for climbing search rankings, the authenticity and credibility of your content are what retain visitors and build lasting trust. SiteDoctor+ was created to bridge this gap, offering a unified platform that scans websites for both technical performance and semantic integrity.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-semibold text-amber-400 mb-3">
                Technical SEO Audits &amp; Semantic AI Verifications
              </h3>
              <p>
                Our advanced technical scanner analyzes crucial SEO metrics, including Core Web Vitals, site response latencies, security configurations, and semantic HTML structures. This ensures that search crawlers can index your website efficiently and rank it appropriately. At the same time, our state-of-the-art AI analysis engine inspects your copywriting for signs of automated text generation, evaluates claims against trusted databases, and alerts you to any copy that might be flagged as low-quality or untrustworthy by modern search engines.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-semibold text-emerald-400 mb-3">
                Visual Asset &amp; Image Integrity Scans
              </h3>
              <p>
                Furthermore, SiteDoctor+ integrates vision intelligence powered by advanced AI models to review your website's visual assets. Images are analyzed for compression quality, stock media repetition, and potential AI manipulation, helping you maintain a consistent and credible brand voice. By combining technical vitals with deep semantic verification, SiteDoctor+ gives you a comprehensive health index of your web property, ensuring it is optimized for both search engines and human readers.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-slate-500 text-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            &copy; {new Date().getFullYear()} SiteDoctor+. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-300 transition-colors">How It Works</a>
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
          <circle
            cx="32"
            cy="32"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="3.5"
            fill="transparent"
          />
          <motion.circle
            cx="32"
            cy="32"
            r={radius}
            className={colorClass}
            strokeWidth="3.5"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
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
