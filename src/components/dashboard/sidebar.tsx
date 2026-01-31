'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isEnterpriseMode, getBranding, showFinancialData } from '@/lib/feature-flags'
import {
  LayoutDashboard,
  Phone,
  Upload,
  Settings,
  TrendingUp,
  FileAudio,
  Shield,
  GitCompare,
  Activity,
} from 'lucide-react'

const baseNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Llamadas', href: '/calls', icon: Phone },
  { name: 'Operaciones', href: '/operaciones', icon: Activity },
  { name: 'Subir Audio', href: '/upload', icon: Upload },
  { name: 'Configuracion', href: '/settings', icon: Settings },
]

const financialNavigation = [
  { name: 'Impacto Financiero', href: '/reportes', icon: TrendingUp },
]

const enterpriseNavigation = [
  { name: 'Comparar', href: '/compare', icon: GitCompare },
]

interface SidebarProps {
  userName?: string | null
  userEmail?: string | null
}

export function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const isEnterprise = isEnterpriseMode()
  const branding = getBranding()

  // Combine navigation based on mode
  const financial = showFinancialData() ? financialNavigation : []
  const enterprise = isEnterprise ? enterpriseNavigation : []
  const navigation = [...baseNavigation, ...financial, ...enterprise]

  // Dynamic logo based on branding
  const LogoIcon = isEnterprise ? Shield : FileAudio

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <LogoIcon className={cn(
          "h-8 w-8",
          isEnterprise ? "text-[var(--enterprise-primary)]" : "text-primary"
        )} />
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-tight">
            {isEnterprise ? 'DeepAudit Enterprise' : branding.name}
          </span>
          {isEnterprise && (
            <span className="text-[10px] text-muted-foreground leading-tight">
              v1.0 | AI-Powered QA
            </span>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {(userName || userEmail) && (
        <div className="px-3 py-2 border-t border-gray-200 mt-auto">
          <p className="text-sm font-medium text-gray-900 truncate">{userName || 'Usuario'}</p>
          {userEmail && <p className="text-xs text-gray-500 truncate">{userEmail}</p>}
        </div>
      )}

      <form action="/api/auth/logout" method="POST" className="px-3 mb-2">
        <button
          type="submit"
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </form>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground text-center">
          {isEnterprise ? '© 2024 DeepAudit' : 'v1.0.0 Standard'}
        </div>
      </div>
    </aside>
  )
}
