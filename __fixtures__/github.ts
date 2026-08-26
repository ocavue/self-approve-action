import { vi } from 'vitest'

export const getContent =
  vi.fn<(...args: unknown[]) => Promise<{ data: unknown }>>()
export const listReviews = vi.fn<(...args: unknown[]) => Promise<unknown[]>>()
export const createReview = vi.fn<(...args: unknown[]) => Promise<unknown>>()
export const getAuthenticated =
  vi.fn<() => Promise<{ data: { login: string } }>>()
export const paginate = vi.fn<(...args: unknown[]) => Promise<unknown[]>>()

export const context = {
  repo: { owner: 'prosekit', repo: 'meowdown' },
  payload: {} as Record<string, unknown>
}

const octokit = {
  paginate,
  rest: {
    repos: { getContent },
    pulls: { listReviews, createReview },
    users: { getAuthenticated }
  }
}

export const getOctokit = vi.fn<() => typeof octokit>(() => octokit)
