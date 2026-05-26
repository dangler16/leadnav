'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function CallTimer({ onDurationChange }: { onDurationChange: (seconds: number) => void }) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callbackRef = useRef(onDurationChange)
  callbackRef.current = onDurationChange

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1
          callbackRef.current(next)
          return next
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  function reset() {
    setRunning(false)
    setElapsed(0)
    callbackRef.current(0)
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-muted rounded-md">
      <span className="text-base font-mono font-semibold text-foreground w-12 tabular-nums">{fmt(elapsed)}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setRunning(r => !r)}
        className="h-7 text-xs"
      >
        {running ? 'Stop' : elapsed > 0 ? 'Resume' : 'Start'}
      </Button>
      {elapsed > 0 && !running && (
        <button
          type="button"
          onClick={reset}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  )
}
