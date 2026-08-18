import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  Activity,
  Globe,
  TrendingUp,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'
import { motion } from 'framer-motion'

interface SidebarProps {
  activeTab: 'sites' | 'analytics' | 'settings'
}

export default function Sidebar({ activeTab }: SidebarProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U'

  return (
    <>
      {/* DESKTOP SIDEBAR (Visible on md and up) */}
      <aside
        className={`hidden md:flex ${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-[#0b0f19] border-r border-slate-800/80 flex-col justify-between p-4 transition-all duration-300 shrink-0 min-h-screen relative group`}
      >
        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-7 bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-slate-100 rounded-full p-1 shadow-md z-30 transition-transform hover:scale-110"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        <div className="space-y-6">
          {/* Header & Logo */}
          <div
            className={`flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between px-2'
            } cursor-pointer pt-2`}
            onClick={() => navigate('/')}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 bg-clip-text text-transparent leading-tight">
                    SiteDoctor+
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                    Audits & Trust
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* MAIN NAVIGATION */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Core Overview
              </p>
            )}

            <nav className="space-y-1 relative">
              <button
                onClick={() => navigate('/dashboard')}
                title="My Sites"
                className={`relative w-full flex items-center ${
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                } py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'sites'
                    ? 'text-emerald-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {activeTab === 'sites' && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/30 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Globe className={`h-4 w-4 shrink-0 ${activeTab === 'sites' ? 'text-emerald-400' : ''}`} aria-hidden="true" />
                {!isCollapsed && <span>My Sites</span>}
              </button>

              <button
                onClick={() => navigate('/dashboard/analytics')}
                title="Analytics"
                className={`relative w-full flex items-center ${
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                } py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'analytics'
                    ? 'text-emerald-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {activeTab === 'analytics' && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/30 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <TrendingUp className={`h-4 w-4 shrink-0 ${activeTab === 'analytics' ? 'text-emerald-400' : ''}`} aria-hidden="true" />
                {!isCollapsed && <span>Analytics</span>}
              </button>
            </nav>
          </div>

          {/* PREFERENCES SECTION */}
          <div className="space-y-1 pt-4 border-t border-slate-900">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Preferences
              </p>
            )}
            <button
              onClick={() => navigate('/dashboard/settings')}
              title="Settings"
              className={`relative w-full flex items-center ${
                isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'settings'
                  ? 'text-emerald-400 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {activeTab === 'settings' && (
                <motion.div
                  layoutId="active-nav-pill"
                  className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/30 rounded-lg -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Settings className={`h-4 w-4 shrink-0 ${activeTab === 'settings' ? 'text-emerald-400' : ''}`} aria-hidden="true" />
              {!isCollapsed && <span>Settings</span>}
            </button>
          </div>
        </div>

        {/* USER PROFILE CARD AT BOTTOM */}
        <div className="mt-8 pt-4 border-t border-slate-900/90 space-y-3">
          {!isCollapsed ? (
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-xs shrink-0 shadow-sm">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate" title={user?.email || ''}>
                    {user?.email}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Pro Active
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 shrink-0"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-xs shadow-sm cursor-pointer"
                title={user?.email || ''}
              >
                {userInitial}
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE HEADER (Visible on screens smaller than md) */}
      <header className="flex md:hidden w-full bg-[#0b0f19] border-b border-slate-800/80 px-4 py-3 items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Activity className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <span className="text-sm font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 bg-clip-text text-transparent">
            SiteDoctor+
          </span>
        </div>

        <nav className="flex items-center gap-1.5 relative">
          <button
            onClick={() => navigate('/dashboard')}
            className={`relative p-2 rounded-lg transition-colors ${
              activeTab === 'sites' ? 'text-emerald-400' : 'text-slate-400'
            }`}
            aria-label="My Sites"
            title="My Sites"
          >
            {activeTab === 'sites' && (
              <motion.div
                layoutId="active-mobile-pill"
                className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/30 rounded-lg -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Globe className="h-4.5 w-4.5" />
          </button>

          <button
            onClick={() => navigate('/dashboard/analytics')}
            className={`relative p-2 rounded-lg transition-colors ${
              activeTab === 'analytics' ? 'text-emerald-400' : 'text-slate-400'
            }`}
            aria-label="Analytics"
            title="Analytics"
          >
            {activeTab === 'analytics' && (
              <motion.div
                layoutId="active-mobile-pill"
                className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/30 rounded-lg -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <TrendingUp className="h-4.5 w-4.5" />
          </button>

          <button
            onClick={() => navigate('/dashboard/settings')}
            className={`relative p-2 rounded-lg transition-colors ${
              activeTab === 'settings' ? 'text-emerald-400' : 'text-slate-400'
            }`}
            aria-label="Settings"
            title="Settings"
          >
            {activeTab === 'settings' && (
              <motion.div
                layoutId="active-mobile-pill"
                className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/30 rounded-lg -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Settings className="h-4.5 w-4.5" />
          </button>

          <span className="w-px h-5 bg-slate-800 mx-1" />

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400"
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
