import * as core from '@actions/core'
import * as utility from './utility'
import * as action from './action'

run()

async function run(): Promise<void> {
  try {
    const branch = core.getInput('branch', {required: true})
    const repository = utility.getRepository()
    const config = await utility.readConfigAny()
    const input = await utility.getInputAny()
    const context = await utility.getContextAny()
    const result = await action.createChangelog(repository.owner, repository.repo, branch, config, input, context)

    await utility.setOutput(result)
  } catch (error) {
    core.setFailed(error.message)
  }
}
