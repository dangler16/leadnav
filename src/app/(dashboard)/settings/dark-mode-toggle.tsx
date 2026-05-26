'use client'

import { useTheme } from '@/components/theme-provider'
import { Moon, Sun } from 'lucide-react'
import { updateDarkMode } from './actions'

export function DarkModeToggle({ initialDark }: { initialDark: boolean }) {
  const { theme, setTheme } = useTheme()
  const dark = theme === 'dark'

  function handleToggle() {
    const next = dark ? 'light' : 'dark'
    setTheme(next)
    updateDarkMode(next === 'dark')
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-foreground">Dark Mode</p>
        <p className="text-xs text-muted-foreground mt-0.5">Switch between light and dark theme</p>
      </div>
      <button
        onClick={handleToggle}
        role="switch"
        aria-checked={dark}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
        data-state={dark ? 'checked' : 'unchecked'}
      >
        <span
          className="pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
          data-state={dark ? 'checked' : 'unchecked'}
        >
          {dark ? <Moon size={11} className="text-primary" /> : <Sun size={11} className="text-muted-foreground" />}
        </span>
      </button>
    </div>
  )
}
