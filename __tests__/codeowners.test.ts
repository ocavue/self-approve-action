import type { getOctokit } from '@actions/github'
import { describe, expect, it } from 'vitest'

import { fetchCodeowners, parseCodeownersUsers } from '../src/codeowners.js'

type Octokit = ReturnType<typeof getOctokit>

describe('parseCodeownersUsers', () => {
  it('collects usernames and ignores teams, emails, and comments', () => {
    const users = parseCodeownersUsers(
      [
        '* @ocavue',
        'docs/ @Alice @octo-org/reviewers docs@example.com',
        '# * @commented-out',
        ''
      ].join('\n')
    )
    expect(users).toEqual(new Set(['ocavue', 'alice']))
  })

  it('ignores inline comments', () => {
    expect(parseCodeownersUsers('* @ocavue # @bob')).toEqual(
      new Set(['ocavue'])
    )
  })
})

describe('fetchCodeowners', () => {
  const params = { owner: 'prosekit', repo: 'meowdown', ref: 'master' }

  function octokitReturning(results: Record<string, string>): Octokit {
    return {
      rest: {
        repos: {
          getContent: ({ path }: { path: string }) => {
            const content = results[path]
            if (content != null) return Promise.resolve({ data: content })
            return Promise.reject(
              Object.assign(new Error('Not Found'), { status: 404 })
            )
          }
        }
      }
    } as unknown as Octokit
  }

  it('prefers .github/CODEOWNERS over the root file', async () => {
    const octokit = octokitReturning({
      '.github/CODEOWNERS': '* @first',
      CODEOWNERS: '* @second'
    })
    await expect(fetchCodeowners(octokit, params)).resolves.toBe('* @first')
  })

  it('returns null when no CODEOWNERS file exists', async () => {
    await expect(
      fetchCodeowners(octokitReturning({}), params)
    ).resolves.toBeNull()
  })

  it('rethrows non-404 errors', async () => {
    const octokit = {
      rest: {
        repos: {
          getContent: () => { return Promise.reject(
              Object.assign(new Error('Server Error'), { status: 500 })
            ) }
        }
      }
    } as unknown as Octokit
    await expect(fetchCodeowners(octokit, params)).rejects.toThrow(
      'Server Error'
    )
  })
})
