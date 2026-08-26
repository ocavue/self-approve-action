import { vi } from 'vitest'

export const getContent =
  vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>()
export const listReviews = vi.fn()
export const createReview = vi.fn<(...args: unknown[]) => Promise<unknown>>()
export const getAuthenticated =
  vi.fn<() => Promise<{ data: { login: string } }>>()
export const paginate = vi.fn<(...args: unknown[]) => Promise<unknown[]>>()

export const context = {
  repo: { owner: 'prosekit', repo: 'meowdown' },
  payload: {} as Record<string, unknown>
}

export const getOctokit = vi.fn(() => ({
  paginate,
  rest: {
    repos: { getContent },
    pulls: { listReviews, createReview },
    users: { getAuthenticated }
  }
}))
