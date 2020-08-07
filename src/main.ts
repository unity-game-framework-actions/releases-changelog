import * as core from '@actions/core'
import * as utility from './utility'
import * as action from './action'

run()

async function run(): Promise<void> {
  try {
    const target = core.getInput('target', {required: true})
    const repository = utility.getRepository()
    const config = await utility.readConfig()
    const result = await action.createChangelog(repository.owner, repository.repo, target, config)

    await utility.setOutput(result)
  } catch (error) {
    core.setFailed(error.message)
  }
}
