'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NavItem } from '@/lib/constants'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface SidebarItemProps {
  item: NavItem
  depth?: number
  collapsed?: boolean
}

export function SidebarItem({ item, depth = 0, collapsed = false }: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
  const hasChildren = item.children && item.children.length > 0
  const [open, setOpen] = useState(isActive)

  const Icon = item.icon

  if (hasChildren && !collapsed) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 group',
            depth === 0 ? 'font-medium' : 'font-normal',
            isActive
              ? 'bg-sidebar-bg-hover text-sidebar-text-active'
              : 'text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white'
          )}
          style={{ paddingLeft: depth > 0 ? `${12 + depth * 12}px` : undefined }}
        >
          <span className="flex items-center gap-2.5">
            {Icon && (
              <Icon
                size={16}
                className={cn(
                  isActive ? 'text-brand-accent' : 'text-sidebar-text group-hover:text-white'
                )}
              />
            )}
            <span>{item.label}</span>
          </span>
          <ChevronRight
            size={14}
            className={cn(
              'transition-transform duration-200 text-sidebar-text',
              open && 'rotate-90'
            )}
          />
        </button>
        {open && (
          <div className="mt-0.5">
            {item.children!.map((child) => (
              <SidebarItem key={child.href} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 group relative',
        depth === 0 ? 'font-medium' : 'font-normal',
        isActive
          ? 'bg-sidebar-bg-hover text-white'
          : 'text-sidebar-text hover:bg-sidebar-bg-hover hover:text-white'
      )}
      style={{ paddingLeft: depth > 0 ? `${12 + depth * 12}px` : undefined }}
    >
      {isActive && depth > 0 && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand-accent rounded-r-full" />
      )}
      {Icon && (
        <Icon
          size={16}
          className={cn(
            isActive ? 'text-brand-accent' : 'text-sidebar-text group-hover:text-white'
          )}
        />
      )}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && (
            <span className="text-xs bg-brand-accent text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  )
}
