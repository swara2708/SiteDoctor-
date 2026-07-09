import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Activity, ShieldAlert, Eye, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
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

          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-slate-400 hover:text-slate-100 hover:bg-slate-900" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold" asChild>
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -z-10 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px] sm:h-[400px] sm:w-[400px]" />
        <div className="absolute top-1/3 left-1/3 -z-10 h-[250px] w-[250px] rounded-full bg-amber-500/5 blur-[80px]" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-100">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              SiteDoctor+
            </span>
            : AI-Powered Website SEO &amp; Content Credibility Scans
          </h1>
          
          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Analyze and optimize your website's performance. SiteDoctor+ evaluates your web properties through a double-lens: auditing standard technical SEO vitals while validating content truthfulness, factual accuracy, and image credibility using state-of-the-art AI models.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:opacity-95" asChild>
              <Link to="/signup" className="inline-flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-800 text-slate-300 hover:bg-slate-900" asChild>
              <a href="#features">Explore Features</a>
            </Button>
          </div>
        </div>
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
            <Card className="bg-slate-900/50 border-slate-800 text-slate-100 hover:border-emerald-500/50 transition-all duration-300">
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

            {/* Trust and Credibility Card */}
            <Card className="bg-slate-900/50 border-slate-800 text-slate-100 hover:border-amber-500/50 transition-all duration-300">
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

            {/* Image Verification Card */}
            <Card className="bg-slate-900/50 border-slate-800 text-slate-100 hover:border-emerald-500/50 transition-all duration-300">
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

            {/* Analytics Dashboard Card */}
            <Card className="bg-slate-900/50 border-slate-800 text-slate-100 hover:border-amber-500/50 transition-all duration-300">
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
            <div className="flex flex-col items-center text-center p-6 bg-slate-900/30 rounded-xl border border-slate-800/60 relative">
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
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-6 bg-slate-900/30 rounded-xl border border-slate-800/60 relative">
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
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-6 bg-slate-900/30 rounded-xl border border-slate-800/60 relative">
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
            </div>

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
            <div>
              <h3 className="text-xl font-semibold text-emerald-400 mb-3">
                Why SEO and Content Credibility Matter Together
              </h3>
              <p>
                In the modern digital landscape, a website's success is determined by more than just traditional search engine optimization (SEO) vitals. While fast load times, mobile friendliness, and proper meta tag structures are essential for climbing search rankings, the authenticity and credibility of your content are what retain visitors and build lasting trust. SiteDoctor+ was created to bridge this gap, offering a unified platform that scans websites for both technical performance and semantic integrity.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-amber-400 mb-3">
                Technical SEO Audits &amp; Semantic AI Verifications
              </h3>
              <p>
                Our advanced technical scanner analyzes crucial SEO metrics, including Core Web Vitals, site response latencies, security configurations, and semantic HTML structures. This ensures that search crawlers can index your website efficiently and rank it appropriately. At the same time, our state-of-the-art AI analysis engine inspects your copywriting for signs of automated text generation, evaluates claims against trusted databases, and alerts you to any copy that might be flagged as low-quality or untrustworthy by modern search engines.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-emerald-400 mb-3">
                Visual Asset &amp; Image Integrity Scans
              </h3>
              <p>
                Furthermore, SiteDoctor+ integrates vision intelligence powered by advanced AI models to review your website's visual assets. Images are analyzed for compression quality, stock media repetition, and potential AI manipulation, helping you maintain a consistent and credible brand voice. By combining technical vitals with deep semantic verification, SiteDoctor+ gives you a comprehensive health index of your web property, ensuring it is optimized for both search engines and human readers.
              </p>
            </div>
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

    </div>
  )
}
