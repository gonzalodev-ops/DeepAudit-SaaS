'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isEnterpriseMode, getBranding } from '@/lib/feature-flags'
import {
  LayoutDashboard,
  Phone,
  Upload,
  Settings,
  BarChart3,
  FileAudio,
  Shield,
  GitCompare
} from 'lucide-react'

const baseNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Llamadas', href: '/calls', icon: Phone },
  { name: 'Subir Audio', href: '/upload', icon: Upload },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
  { name: 'Configuracion', href: '/settings', icon: Settings },
]

const enterpriseNavigation = [
  { name: 'Comparar', href: '/compare', icon: GitCompare },
]

export function Sidebar() {
  const pathname = usePathname()
  const isEnterprise = isEnterpriseMode()
  const branding = getBranding()

  // Combine navigation based on mode
  const navigation = isEnterprise
    ? [...baseNavigation, ...enterpriseNavigation]
    : baseNavigation

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
          <span className="text-xl font-bold leading-tight">{branding.name}</span>
          {isEnterprise && branding.subtitle && (
            <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[160px]">
              {branding.subtitle}
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

      {/* Footer con version */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>v1.0.0</span>
          <span>{isEnterprise ? 'Enterprise' : 'Standard'}</span>
        </div>
      </div>
    </aside>
  )
}
