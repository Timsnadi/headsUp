import { useCallback, useEffect, useState } from 'react'
import { lessonRepository, unitRepository } from '../../db/repositories'
import { getScheduledLessons, type ScheduledLesson } from './scheduleUtils'

export function useScheduleUnits() {
  const [lessons, setLessons] = useState<ScheduledLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [units, allLessons] = await Promise.all([unitRepository.list(), lessonRepository.list()])
      setLessons(getScheduledLessons(allLessons, units))
      setError('')
    } catch {
      setError('Your schedule could not be loaded. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { lessons, loading, error, reload: load }
}
