import * as utility from './utility'

export async function createChangelog(owner: string, repo: string, branch: string, config: any): Promise<string> {
  const releases = await getReleases(owner, repo, branch)

  return formatChangelog(releases, config)
}

function formatChangelog(releases: any[], config: any): string {
  let format = ''

  if (config.body !== '') {
    releases.sort((a, b) => b.published_at.localeCompare(a.published_at))

    const values = {
      releases: releases,
      releasesFormatted: formatReleases(releases, config)
    }

    format += utility.formatValues(config.body, values)
    format = utility.normalize(format)
  }

  return format
}

function formatReleases(releases: any[], config: any): string {
  let format = ''

  for (const release of releases) {
    const date = utility.formatDate(new Date(release.published_at), config.dateFormat)
    const values = {
      releases: releases,
      release: release,
      date: date
    }

    format += utility.formatValues(config.release, values)

    if (config.releaseBody) {
      if (release.body !== '') {
        format += `\n${release.body.trim()}\n\n`
      } else {
        format += `\n${config.empty}\n`
      }
    } else {
      format += '\n'
    }
  }

  return format
}

async function getReleases(owner: string, repo: string, branch: string): Promise<any[]> {
  const result = []
  let releases = []

  if (branch === 'all') {
    releases = await utility.getReleases(owner, repo)
  } else {
    releases = await utility.getReleasesByBranch(owner, repo, branch)
  }

  for (const release of releases) {
    if (release.published_at !== '') {
      result.push(release)
    }
  }

  return result
}
