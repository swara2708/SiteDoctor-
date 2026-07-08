import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui/button'
import { Activity, Globe, TrendingUp, Settings, LogOut } from 'lucide-react'

interface SidebarProps {
  activeTab: 'sites' | 'analytics' | 'settings'
}

export default function Sidebar({ activeTab }: SidebarProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <>
      {/* DESKTOP SIDEBAR (Visible on md and up) */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between p-6 shrink-0 min-h-screen">
        <div className="space-y-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Activity className="h-6 w-6 text-emerald-400" aria-hidden="true" />
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
              SiteDoctor+
            </span>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => navigate('/dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md border transition-all ${
                activeTab === 'sites'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              My Sites
            </button>
            
            <button 
              onClick={() => navigate('/dashboard/analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md border transition-all ${
                activeTab === 'analytics'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              Analytics
            </button>
            
            <button 
              onClick={() => navigate('/dashboard/settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md border transition-all ${
                activeTab === 'settings'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Settings
            </button>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
          <div className="px-3">
            <p className="text-xs text-slate-500">Logged in as</p>
            <p className="text-sm font-medium text-slate-300 truncate" title={user?.email || ''}>
              {user?.email}
            </p>
          </div>
          <Button 
            onClick={handleLogout}
            variant="ghost" 
            className="w-full flex items-center gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 justify-start"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </Button>
        </div>
      </aside>

      {/* MOBILE HEADER (Visible on screens smaller than md) */}
      <header className="flex md:hidden w-full bg-slate-900 border-b border-slate-800 p-4 items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigate('/')}>
          <Activity className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          <span className="text-sm font-bold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
            SiteDoctor+
          </span>
        </div>

        {/* Horizontal Navigation Buttons */}
        <nav className="flex items-center gap-1">
          <button 
            onClick={() => navigate('/dashboard')}
            className={`p-2 rounded-md border text-xs font-semibold ${
              activeTab === 'sites'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'text-slate-400 border-transparent'
            }`}
            aria-label="My Sites"
            title="My Sites"
          >
            <Globe className="h-4.5 w-4.5" />
          </button>
          <button 
            onClick={() => navigate('/dashboard/analytics')}
            className={`p-2 rounded-md border text-xs font-semibold ${
              activeTab === 'analytics'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'text-slate-400 border-transparent'
            }`}
            aria-label="Analytics"
            title="Analytics"
          >
            <TrendingUp className="h-4.5 w-4.5" />
          </button>
          <button 
            onClick={() => navigate('/dashboard/settings')}
            className={`p-2 rounded-md border text-xs font-semibold ${
              activeTab === 'settings'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'text-slate-400 border-transparent'
            }`}
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>
          
          <span className="w-px h-5 bg-slate-800 mx-1" />

          <button 
            onClick={handleLogout}
            className="p-2 rounded-md text-slate-400 hover:text-red-400"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </nav>
      </header>
    </>
  )
}
