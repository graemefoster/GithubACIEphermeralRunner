import { validateGithubSignature } from '../Shared/github-signature-validation'
import { addOrUpdateJob, Logger } from '../Shared/github-jobs-repository'

export interface WebHookResponse {
    status: number,
    body: string
}

export type SendQueueMessage = (s: string) => void

export async function handleWebHook(body: any, signatureHeader: string, sendQueueMessage: SendQueueMessage, logger: Logger): Promise<WebHookResponse> {

    if (!validateGithubSignature(body, signatureHeader, logger)) {
        return {
            status: 401,
            body: "Signatures don't match"
        }
    } else {
        const action = body?.action;

        // verify that we have a payload with an action property
        if (action) {
            logger('Acknowledge receipt of {action} event', action);
        } else {
            return {
                status: 400,
                body: "Expected 'workflow_job' payload"
            }
        }

        // extract required metadata
        const org = body?.organization?.login
        const repo = body?.repository?.name
        const actor = body?.sender?.login
        const labels = body?.workflow_job?.labels as string[]

        // log info
        logger('Action: {action}, org: {org}, repo: {repo}, sender: {actor}, labels: {labels}', action, org, repo, action, labels)

        if (labels.length === 0) {
            const msg = 'No labels supplied. Ignoring event'
            logger(msg);
            return {
                status: 200,
                body: msg
            }
        }

        const expectedLabel = process.env['GITHUB_RUNS_ON']
        if (labels[0] !== expectedLabel) {
            logger('First label does not match env variable GITHUB_RUNS_ON. Ignoring job. Label to trigger Self Hosted runner is {GITHUB_RUNS_ON}', expectedLabel);
            return {
                status: 200,
                body: 'First label does not match env variable GITHUB_RUNS_ON. Ignoring job'
            }
        }

        // invoke the workflow to handle the scale up/scale down action
        logger('Handling action {action}', action);
        const task = await addOrUpdateJob(`${body.workflow_job.id}`, body.action, logger)
        sendQueueMessage(task.rowKey)
        return {
            status: 200,
            body: `Queued Runner for job ${body.workflow_job.id}`
        }
    }
}