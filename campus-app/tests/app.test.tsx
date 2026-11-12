import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from '../src/App'

vi.mock('../src/services/pwa', () => ({
  registerPwaServiceWorker: () => async () => undefined,
}))

vi.mock('../src/db/database', () => ({
  ensureDatabaseReady: async () => undefined,
}))

describe('App shell', () => {
  it('shows the branded loading state before rendering the app shell', async () => {
    render(<App />)

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'headsUp' })).toBeInTheDocument()
    expect(screen.getAllByText(/Today/i).length).toBeGreaterThan(0)
  })
})
