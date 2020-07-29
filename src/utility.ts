import * as core from '@actions/core'
import * as github from '@actions/github'
import {promises as fs} from 'fs'
import * as yaml from 'js-yaml'
import * as eol from 'eol'
import indentString from 'indent-string'
import objectPath from 'object-path'

export async function readConfig(): Promise<any> {
  const path = core.getInput('config', {required: true})
  const type = core.getInput('configType', {required: true})

  return await readData(path, type)
}

export async function readData(path: string, type: string): Promise<any> {
  const value = await read(path)
  const data = parse(value, type)

  return data
}

export async function read(path: string): Promise<string> {
  const buffer = await fs.readFile(path)

  return buffer.toString()
}

export async function writeData(path: string, data: any, type: string): Promise<void> {
  const value = format(data, type)

  await write(path, value)
}

export async function write(path: string, value: string): Promise<void> {
  await fs.writeFile(path, value)
}

export function format(value: any, type: string): string {
  switch (type) {
    case 'json':
      return JSON.stringify(value)
    case 'yaml':
      return yaml.dump(value)
    default:
      throw `Invalid parse type: '${type}'.`
  }
}

export function parse(value: string, type: string): any {
  if (value === '') {
    return {}
  }

  switch (type) {
    case 'json':
      return JSON.parse(value)
    case 'yaml':
      return yaml.load(value)
    default:
      throw `Invalid parse type: '${type}'.`
  }
}

export function setOutput(value: string) {
  const type = core.getInput('outputType', {required: true})

  setOutputByType(type, value)
}

export function setOutputByType(type: string, value: string) {
  if (type === 'action' || type === 'all') {
    core.setOutput('result', value)
  } else if (type === 'file' || type === 'all') {
    const path = core.getInput('outputPath', {required: true})

    write(path, value)
  } else {
    throw `Invalid output type: '${type}'.`
  }
}

export function normalize(value: string): string {
  return eol.crlf(value)
}

export function formatValues(value: string, values: any): string {
  const matches = value.match(new RegExp('{([^{}]+)}', 'g'))

  if (matches != null && matches.length > 0) {
    for (const match of matches) {
      if (match !== '') {
        const path = match.substr(1, match.length - 2)
        const replace = getValue(values, path)

        value = value.replace(match, replace)
      }
    }
  }

  return value
}

export function indent(value: string, count: number): string {
  return indentString(value, count)
}

export function getValue(target: any, path: string): any {
  return objectPath.get(target, path)
}

export function setValue(target: any, path: string, value: any) {
  objectPath.set(target, path, value)
}

export function getRepository(): {owner: string; repo: string} {
  const repository = core.getInput('repository')

  return getOwnerAndRepo(repository)
}

export function getOwnerAndRepo(repo: string): {owner: string; repo: string} {
  const split = repo.split('/')

  if (split.length < 2) {
    throw `Invalid repository name: '${repo}'.`
  }

  return {
    owner: split[0],
    repo: split[1]
  }
}

export function formatDate(date: Date, config: any): any {
  const result: any = {}
  const keys = Object.keys(config)

  for (const key of keys) {
    if (key !== 'locale') {
      const options = {
        [key]: config[key]
      }

      const format = new Intl.DateTimeFormat(config.locale, options)

      result[key] = format.format(date)
    }
  }

  return result
}

export function getOctokit(): any {
  const token = core.getInput('token', {required: true})

  return github.getOctokit(token)
}

export async function getMilestone(owner: string, repo: string, milestoneNumberOrTitle: string): Promise<any> {
  const octokit = getOctokit()

  try {
    const milestones = await octokit.paginate(`GET /repos/${owner}/${repo}/milestones/${milestoneNumberOrTitle}`)

    return milestones[0]
  } catch (error) {
    const milestones = await octokit.paginate(`GET /repos/${owner}/${repo}/milestones?state=all`)

    for (const milestone of milestones) {
      if (milestone.title === milestoneNumberOrTitle) {
        return milestone
      }
    }

    core.info(`Milestone not found by the specified number or title: '${milestoneNumberOrTitle}'.`)

    return null
  }
}

export async function getMilestoneIssues(owner: string, repo: string, milestone: number, state: string, labels: string): Promise<any[]> {
  const octokit = getOctokit()
  const issues = await octokit.paginate(`GET /repos/${owner}/${repo}/issues?milestone=${milestone}&state=${state}&labels=${labels}`)

  return issues
}

export async function updateContent(owner: string, repo: string, content: string, file: string, branch: string, message: string, user: string, email: string): Promise<void> {
  const octokit = getOctokit()
  const info = await octokit.request(`GET /repos/${owner}/${repo}/contents/${file}?ref=${branch}`)
  const base64 = Buffer.from(content).toString('base64')
  const sha = info.data.sha

  await octokit.repos.createOrUpdateFile({
    owner: owner,
    repo: repo,
    path: file,
    message: message,
    content: base64,
    sha: sha,
    branch: branch,
    committer: {
      name: user,
      email: email
    },
    author: {
      name: user,
      email: email
    }
  })
}

export async function getRelease(owner: string, repo: string, idOrTag: string): Promise<any> {
  const octokit = getOctokit()

  try {
    const releases = await octokit.paginate(`GET /repos/${owner}/${repo}/releases/${idOrTag}`)

    return releases[0]
  } catch (error) {
    const releases = await octokit.paginate(`GET /repos/${owner}/${repo}/releases`)

    for (const release of releases) {
      if (release.tag_name === idOrTag) {
        return release
      }
    }

    core.warning(`Release by the specified id or tag name not found: '${idOrTag}'.`)

    return null
  }
}

export async function getReleases(owner: string, repo: string): Promise<any[]> {
  const octokit = getOctokit()

  return await octokit.paginate(`GET /repos/${owner}/${repo}/releases`)
}

export async function updateRelease(owner: string, repo: string, release: any): Promise<void> {
  const octokit = getOctokit()

  await octokit.repos.updateRelease({
    owner: owner,
    repo: repo,
    release_id: release.id,
    tag_name: release.tag_name,
    target_commitish: release.target_commitish,
    name: release.name,
    body: release.body,
    draft: release.draft,
    prerelease: release.prerelease
  })
}

export function changeRelease(release: any, change: any): any {
  if (change.tag !== '') {
    release.tag_name = change.tag
  }

  if (change.commitish !== '') {
    release.target_commitish = change.commitish
  }

  if (change.name !== '') {
    release.name = change.name
  }

  if (change.body !== '') {
    release.body = change.body
  }

  if (change.draft !== '') {
    release.draft = change.draft === 'true'
  }

  if (change.prerelease !== '') {
    release.prerelease = change.prerelease === 'true'
  }

  return release
}

export async function dispatch(owner: string, repo: string, eventType: string, payload: any): Promise<void> {
  const octokit = getOctokit()

  await octokit.repos.createDispatchEvent({
    owner: owner,
    repo: repo,
    event_type: eventType,
    client_payload: JSON.stringify(payload)
  })
}
