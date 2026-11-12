import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from '../src/App'

vi.mock('../src/services/pwa', () => ({
  registerPwaServiceWorker: () => async () => undefined,
}))

describe('App shell', () => {
  it('renders the campus app shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'headsUp' })).toBeInTheDocument()
    expect(screen.getAllByText(/Today/i).length).toBeGreaterThan(0)
  })
})
