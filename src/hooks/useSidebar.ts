'use client'

import { useState, useEffect } from 'react'

export function useSidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-open')
    if (stored !== null) setIsOpen(JSON.parse(stored))

    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setIsOpen(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggle = () => {
    const next = !isOpen
    setIsOpen(next)
    if (!isMobile) localStorage.setItem('sidebar-open', JSON.stringify(next))
  }

  return { isOpen, toggle, isMobile }
}
