'use client'

import { Building2, ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TenantSelectorProps {
  tenants: Array<{ id: string; name: string; industry: string | null }>
  currentTenantId: string
  onTenantChange: (tenantId: string) => void
}

export function TenantSelector({
  tenants,
  currentTenantId,
  onTenantChange,
}: TenantSelectorProps) {
  const currentTenant = tenants.find((t) => t.id === currentTenantId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 min-w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate max-w-[150px]">
              {currentTenant?.name || 'Seleccionar empresa'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[250px]">
        <DropdownMenuLabel>Cambiar empresa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => onTenantChange(tenant.id)}
            className={cn(
              'flex items-center justify-between cursor-pointer',
              tenant.id === currentTenantId && 'bg-accent'
            )}
          >
            <div className="flex flex-col">
              <span className="font-medium">{tenant.name}</span>
              {tenant.industry && (
                <span className="text-xs text-muted-foreground">
                  {tenant.industry}
                </span>
              )}
            </div>
            {tenant.id === currentTenantId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
