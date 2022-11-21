import { TableClient, RestError } from '@azure/data-tables'

export type Logger = (s: string, ...args: any[]) => void

//Enum to represent 3 possible states of a Github Action job
export enum JobStatus {
    Pending,
    BuildingContainer,
    InProgress,
    Completed
}


//Represents a job exeuted by a Github Action workflow
export type ActionsJob = {
    partitionKey: string
    rowKey: string
    status: JobStatus
    enqueuedAt: Date
    updatedAt: Date
}

const tableUrl = process.env['AZURE_STORAGE_CONNECTION_STRING'] as string
const tableClient = TableClient.fromConnectionString(tableUrl, 'githubJobs')

//Returns job (or throws )
export async function getJob(jobId: string): Promise<ActionsJob | undefined> {

    await tableClient.createTable()
    try {
        return await tableClient.getEntity<ActionsJob>('job', `${jobId}`)
    } catch (e) {
        if (e instanceof RestError) {
            if (e.statusCode === 404) {
                return undefined
            }
        }
        throw e
    }
}

export async function updateJob(job: ActionsJob, logger: Logger): Promise<ActionsJob> {
    logger('Updating job {jobId}, status {githubStatus}', job.rowKey, job.status)
    job.updatedAt = new Date()
    await tableClient.updateEntity(job, 'Replace')
    return job
}

export async function addOrUpdateJob(jobId: string, githubStatus: string, logger: Logger): Promise<ActionsJob> {

    await tableClient.createTable()
    const status = githubStatus === 'queued' ? JobStatus.Pending : githubStatus == 'in_progress' ? JobStatus.InProgress : JobStatus.Completed

    let existingJob = await getJob(jobId)
    if (existingJob !== undefined) {
        existingJob.status = status
        return await updateJob(existingJob, logger)
    }
    else {
        logger('Creating new job representing {jobId} at status {githubStatus}', jobId, githubStatus)
        const now = new Date()
        const task: ActionsJob = {
            partitionKey: "job",
            rowKey: jobId,
            status: status,
            enqueuedAt: now,
            updatedAt: now
        }

        await tableClient.createEntity<ActionsJob>(task)
        return task
    }
}
