import { useEffect, useState } from 'react'
import { courseRepository } from '../../db/repositories'
import type { Course } from '../../types'

export function useScheduleCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadCourses() {
      try {
        const savedCourses = await courseRepository.list()
        if (active) {
          setCourses(savedCourses)
          setError('')
        }
      } catch {
        if (active) {
          setError('Your schedule could not be loaded. Please try again.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadCourses()

    return () => {
      active = false
    }
  }, [])

  return { courses, loading, error }
}
