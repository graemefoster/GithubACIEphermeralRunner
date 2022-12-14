import { AzureFunction, Context } from "@azure/functions"
import { ContainerInstanceManagementClient } from '@azure/arm-containerinstance'
import { DefaultAzureCredential } from '@azure/identity'
import { JobStatus, getJob, updateJob } from '../Shared/github-jobs-repository'

const subscriptionId = process.env['AZURE_SUBSCRIPTION_ID']
const client = new ContainerInstanceManagementClient(new DefaultAzureCredential(), subscriptionId);

const queueTrigger: AzureFunction = async function (context: Context, jobId: string): Promise<void> {

    const jobDetails = await getJob(jobId)
    switch (jobDetails.status) {
        case JobStatus.Pending:
            context.log('Creating container to run Pending job {jobId}', jobId)
            const createOperation = await client.containerGroups.beginCreateOrUpdate(
                process.env['AZURE_RESOURCE_GROUP'] as string,
                `gh-${jobDetails.rowKey}`,
                {
                    location: 'eastus',
                    osType: 'Linux',
                    containers: [
                        {
                            image: 'graemefoster/graemesgithubactionrunner:0.1.0',
                            name: 'runner',
                            resources: {
                                requests: {
                                    cpu: 1,
                                    memoryInGB: 2
                                }
                            },
                            environmentVariables: [
                                {
                                    name: 'REPO_URL',
                                    value: process.env['GITHUB_REPO_URL'] as string
                                },
                                {
                                    name: 'RUNNER_NAME',
                                    value: `runner-${jobId}`
                                },
                                {
                                    name: 'RUNNER_WORKDIR',
                                    value: '/tmp/github-runner'
                                },
                                {
                                    name: 'ACCESS_TOKEN',
                                    secureValue: process.env['GITHUB_PAT_TOKEN'] as string
                                },
                                {
                                    name: 'RUNNER_SCOPE',
                                    value: 'repo'
                                },
                                {
                                    name: 'LABELS',
                                    value: process.env['GITHUB_RUNS_ON'] as string
                                },
                                {
                                    name: 'EPHEMERAL',
                                    value: 'true'
                                }
                            ]
                        }
                    ],
                    subnetIds: [
                        {
                            id: process.env['AZURE_SUBNET_ID'] as string
                        }
                    ]
                }
            )

            jobDetails.status = JobStatus.BuildingContainer
            await updateJob(jobDetails, context.log)

            //could wait here but we just chew up function time. Optimisation could be a durable function to handle a serveless wait.
            //await createOperation.pollUntilDone()

            break;
        case JobStatus.Completed:
            context.log('Detected job completion. Deleting container for job-id: {id}', jobDetails.rowKey)
            const deleteOperation = await client.containerGroups.beginDelete(
                process.env['AZURE_RESOURCE_GROUP'] as string,
                `gh-${jobDetails.rowKey}`,
            )
            //could wait here but we just chew up function time. Optimisation could be a durable function to handle a serveless wait.
            //await deleteOperation.pollUntilDone()
            break;
    }

    context.log('Queue trigger function processed work item', jobId);
};

export default queueTrigger;
