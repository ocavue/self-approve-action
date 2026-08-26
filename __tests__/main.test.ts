import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as core from '../__fixtures__/core.js'
import * as github from '../__fixtures__/github.js'
import { run } from '../src/main.js'

vi.mock('@actions/core', () => import('../__fixtures__/core.js'))
vi.mock('@actions/github', () => import('../__fixtures__/github.js'))

function setPullRequest(overrides: Record<string, unknown> = {}): void {
  github.context.payload = {
    pull_request: {
      number: 42,
      draft: false,
      user: { login: 'ocavue' },
      base: { ref: 'master' },
      ...overrides
    },
    repository: { owner: { login: 'prosekit', type: 'Organization' } }
  }
}

const NOT_FOUND = Object.assign(new Error('Not Found'), { status: 404 })

describe('run', () => {
  beforeEach(() => {
    setPullRequest()
    core.getInput.mockReturnValue('fake-token')
    github.getContent.mockResolvedValue({ data: '* @ocavue\n' })
    github.paginate.mockResolvedValue([])
    github.getAuthenticated.mockRejectedValue(
      new Error('Resource not accessible by integration')
    )
    github.createReview.mockResolvedValue({})
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('approves a non-draft pull request authored by a code owner', async () => {
    await run()

    expect(github.createReview).toHaveBeenCalledWith({
      owner: 'prosekit',
      repo: 'meowdown',
      pull_number: 42,
      event: 'APPROVE'
    })
    expect(core.setOutput).toHaveBeenCalledWith('approved', 'true')
  })

  it('skips events without a pull request', async () => {
    github.context.payload = {}

    await run()

    expect(github.createReview).not.toHaveBeenCalled()
    expect(core.setOutput).toHaveBeenCalledWith('approved', 'false')
  })

  it('skips draft pull requests', async () => {
    setPullRequest({ draft: true })

    await run()

    expect(github.createReview).not.toHaveBeenCalled()
  })

  it('skips org-owned repositories without a CODEOWNERS file', async () => {
    github.getContent.mockRejectedValue(NOT_FOUND)

    await run()

    expect(github.createReview).not.toHaveBeenCalled()
  })

  it('falls back to the repository owner in user-owned repositories without CODEOWNERS', async () => {
    github.context.payload.repository = {
      owner: { login: 'ocavue', type: 'User' }
    }
    github.getContent.mockRejectedValue(NOT_FOUND)

    await run()

    expect(github.createReview).toHaveBeenCalled()
  })

  it('skips authors that are not code owners', async () => {
    setPullRequest({ user: { login: 'someone-else' } })

    await run()

    expect(github.createReview).not.toHaveBeenCalled()
  })

  it('skips when github-actions[bot] already approved', async () => {
    github.paginate.mockResolvedValue([
      { user: { login: 'github-actions[bot]' }, state: 'APPROVED' }
    ])

    await run()

    expect(github.createReview).not.toHaveBeenCalled()
    expect(core.setOutput).toHaveBeenCalledWith('approved', 'false')
  })

  it('re-approves after its previous approval was dismissed', async () => {
    github.paginate.mockResolvedValue([
      { user: { login: 'github-actions[bot]' }, state: 'DISMISSED' }
    ])

    await run()

    expect(github.createReview).toHaveBeenCalled()
  })

  it('matches reviews by the authenticated user when the token has one', async () => {
    github.getAuthenticated.mockResolvedValue({ data: { login: 'ocavuebot' } })
    github.paginate.mockResolvedValue([
      { user: { login: 'ocavuebot' }, state: 'APPROVED' }
    ])

    await run()

    expect(github.createReview).not.toHaveBeenCalled()
  })

  it('explains the workflow settings error', async () => {
    github.createReview.mockRejectedValue(
      new Error('GitHub Actions is not permitted to approve pull requests.')
    )

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining(
        'Allow GitHub Actions to create and approve pull requests'
      )
    )
  })
})
