import * as utility from './utility'

export async function createChangelog(owner: string, repo: string, branch: string, config: any, input: any): Promise<string> {
  const releases = await getReleases(owner, repo, branch, input)

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

async function getReleases(owner: string, repo: string, branch: string, input: any): Promise<any[]> {
  const result = []
  const releases = []

  if (input.hasOwnProperty('releases')) {
    for (const release of input.releases) {
      releases.push(release)
    }
  }

  if (branch === 'all') {
    for (const release of await utility.getReleases(owner, repo)) {
      releases.push(release)
    }
  } else {
    for (const release of await utility.getReleasesByBranch(owner, repo, branch)) {
      releases.push(release)
    }
  }

  for (const release of releases) {
    if (release.published_at !== '') {
      result.push(release)
    }
  }

  return result
}
