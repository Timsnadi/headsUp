import { useSyncExternalStore } from 'react'

let currentDate = new Date()
let timer: number | undefined
const listeners = new Set<() => void>()

function refreshDate() {
  const nextDate = new Date()
  if (nextDate.toDateString() !== currentDate.toDateString()) {
    currentDate = nextDate
    listeners.forEach((listener) => listener())
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (timer === undefined) {
    timer = window.setInterval(refreshDate, 60_000)
  }

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
}

function getSnapshot(): Date {
  return currentDate
}

export function useTodayDate(): Date {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
