'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Phone,
  Upload,
  Settings,
  BarChart3,
  FileAudio
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Llamadas', href: '/calls', icon: Phone },
  { name: 'Subir Audio', href: '/upload', icon: Upload },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
  { name: 'Configuracion', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <FileAudio className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">DeepAudit</span>
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

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">D</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Demo Company</p>
            <p className="text-xs text-muted-foreground truncate">demo@deepaudit.com</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
