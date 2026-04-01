'use client'

import { cn } from '@/lib/utils'
import { NAV_CONFIG, BRAND } from '@/lib/constants'
import { SidebarItem } from './SidebarItem'
import { ChevronLeft, LayoutDashboard } from 'lucide-react'
import { useState } from 'react'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    starred: true,
    recent: false,
    departments: true,
  })

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out',
        'bg-[#16213e] border-r border-sidebar-border',
        isOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center shrink-0">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          {isOpen && (
            <span className="text-white font-semibold text-sm truncate">{BRAND.name}</span>
          )}
        </div>
        {isOpen && (
          <button
            onClick={onToggle}
            className="ml-auto text-sidebar-text hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-2 space-y-1">
        {NAV_CONFIG.map((section) => (
          <div key={section.id} className="mb-1">
            {/* Section Header */}
            {isOpen && (
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-2 py-1.5 mb-1 group"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-text/60 group-hover:text-sidebar-text transition-colors">
                  {section.label}
                </span>
              </button>
            )}
            {(!isOpen || expandedSections[section.id]) && (
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarItem
                    key={item.href}
                    item={item}
                    depth={0}
                    collapsed={!isOpen}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-3 border-t border-sidebar-border">
        {!isOpen && (
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center py-2 text-sidebar-text hover:text-white transition-colors"
          >
            <ChevronLeft size={16} className="rotate-180" />
          </button>
        )}
        {isOpen && (
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-full bg-brand-accent/20 flex items-center justify-center shrink-0">
              <span className="text-brand-accent text-xs font-bold">BC</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">B.cave</p>
              <p className="text-[10px] text-sidebar-text truncate">업무 자동화 플랫폼</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
