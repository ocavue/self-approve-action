import type { getOctokit } from '@actions/github'

type Octokit = ReturnType<typeof getOctokit>

// GitHub reads CODEOWNERS from these locations, in this priority order, and
// uses the first file it finds:
// https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners#codeowners-file-location
const CODEOWNERS_PATHS = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS']

/**
 * Fetches the raw CODEOWNERS file from the given repository and ref, or null
 * when the repository has none.
 */
export async function fetchCodeowners(
  octokit: Octokit,
  params: { owner: string; repo: string; ref: string }
): Promise<string | null> {
  for (const path of CODEOWNERS_PATHS) {
    try {
      const response = await octokit.rest.repos.getContent({
        ...params,
        path,
        mediaType: { format: 'raw' }
      })
      if (typeof response.data === 'string') return response.data
    } catch (error) {
      if ((error as { status?: number }).status === 404) continue
      throw error
    }
  }
  return null
}

/**
 * Returns the lowercased usernames listed as owners in a CODEOWNERS file.
 * Teams (`@org/team`) and email addresses are ignored because they cannot be
 * compared against a pull request author's login.
 */
export function parseCodeownersUsers(content: string): Set<string> {
  const users = new Set<string>()
  for (const rawLine of content.split('\n')) {
    const line = rawLine.replace(/#.*/, '').trim()
    if (!line) continue
    const [, ...owners] = line.split(/\s+/)
    for (const owner of owners) {
      if (owner.startsWith('@') && !owner.includes('/')) {
        users.add(owner.slice(1).toLowerCase())
      }
    }
  }
  return users
}
