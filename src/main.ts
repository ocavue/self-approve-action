import * as core from '@actions/core'
import * as github from '@actions/github'

import { fetchCodeowners, parseCodeownersUsers } from './codeowners.js'

type Octokit = ReturnType<typeof github.getOctokit>

// Reviews created with the default workflow token belong to this user.
const FALLBACK_APPROVER = 'github-actions[bot]'

interface PullRequestPayload {
  number: number
  draft?: boolean
  user: { login: string }
  base: { ref: string }
}

export async function run(): Promise<void> {
  try {
    const pull = github.context.payload.pull_request as
      PullRequestPayload | undefined
    if (!pull) {
      skip('this event has no pull request, so there is nothing to approve')
      return
    }
    if (pull.draft) {
      skip(`pull request #${pull.number} is a draft`)
      return
    }

    const octokit = github.getOctokit(
      core.getInput('github-token', { required: true })
    )
    const { owner, repo } = github.context.repo

    const codeownersContent = await fetchCodeowners(octokit, {
      owner,
      repo,
      ref: pull.base.ref
    })

    let codeowners: Set<string>
    if (codeownersContent != null) {
      codeowners = parseCodeownersUsers(codeownersContent)
    } else {
      const repoOwner = github.context.payload.repository?.owner
      if (repoOwner?.type !== 'User') {
        skip(
          'the repository has no CODEOWNERS file and is not owned by a user account, so there is no owner to infer'
        )
        return
      }
      codeowners = new Set([repoOwner.login.toLowerCase()])
    }

    const author = pull.user.login
    if (!codeowners.has(author.toLowerCase())) {
      skip(`the author @${author} is not a code owner`)
      return
    }

    const approver = await resolveApproverLogin(octokit)
    const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
      owner,
      repo,
      pull_number: pull.number
    })
    const ownReviews = reviews.filter(
      (review) => review.user?.login === approver
    )
    if (ownReviews.at(-1)?.state === 'APPROVED') {
      skip(`@${approver} has already approved pull request #${pull.number}`)
      return
    }

    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pull.number,
      event: 'APPROVE'
    })
    core.info(`Approved pull request #${pull.number} as @${approver}`)
    core.setOutput('approved', 'true')
    core.setOutput('reason', '')
  } catch (error) {
    if (Error.isError(error)) core.setFailed(explainError(error))
  }
}

function skip(reason: string): void {
  core.notice(`Not approving: ${reason}`)
  core.setOutput('approved', 'false')
  core.setOutput('reason', reason)
}

async function resolveApproverLogin(octokit: Octokit): Promise<string> {
  try {
    const { data } = await octokit.rest.users.getAuthenticated()
    return data.login
  } catch {
    // The default workflow token is an installation token and cannot call
    // this endpoint.
    return FALLBACK_APPROVER
  }
}

function explainError(error: Error): string {
  if (error.message.includes('not permitted to approve')) {
    return `${error.message} Enable "Allow GitHub Actions to create and approve pull requests" under Settings > Actions > General.`
  }
  return error.message
}
