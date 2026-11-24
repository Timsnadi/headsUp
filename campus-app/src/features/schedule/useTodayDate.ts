import { useSyncExternalStore } from 'react'
import { getDateKey } from './scheduleUtils'

function todayInNairobi(): Date {
  const [year, month, day] = getDateKey(new Date()).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

let currentDate = todayInNairobi()
let timer: number | undefined
const listeners = new Set<() => void>()

function refreshDate() {
  const nextDate = todayInNairobi()
  if (getDateKey(nextDate) !== getDateKey(currentDate)) {
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
