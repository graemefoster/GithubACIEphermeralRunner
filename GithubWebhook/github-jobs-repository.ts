import { TableClient, RestError } from '@azure/data-tables'

enum JobStatus {
    Pending,
    InProgress,
    Completed
}

type Task = {
    partitionKey: string
    rowKey: string
    description: string
    status: JobStatus
    enqueuedAt: Date
    updatedAt: Date
}

export async function addJob(jobId: string, githubStatus: string): Promise<void> {

    const tableUrl = process.env['AZURE_STORAGE_CONNECTION_STRING'] ?? ''
    const tableClient = TableClient.fromConnectionString(tableUrl, 'githubJobs')
    await tableClient.createTable()
    const status = githubStatus === 'queued' ? JobStatus.Pending : githubStatus == 'in_progress' ? JobStatus.InProgress : JobStatus.Completed

    try {
        const existingJob = await tableClient.getEntity<Task>('job', jobId)
        console.log(`Found existing job representing ${jobId} at status ${githubStatus})`)
        existingJob.updatedAt = new Date()
        existingJob.status = status
        
        await tableClient.updateEntity(existingJob, 'Replace')
    } catch (e) {
        if (e instanceof RestError) {
            if (e.statusCode === 404) {
                console.log(`Creating new job representing ${jobId} at status ${githubStatus}`)
                const now = new Date()
                const task: Task = {
                    partitionKey: "job",
                    rowKey: jobId,
                    description: "Test",
                    status: status,
                    enqueuedAt: now,
                    updatedAt: now
                }

                await tableClient.createEntity<Task>(task) 
            }
        }
    }
}
