import { AzureFunction, Context } from "@azure/functions"
import { ContainerInstanceManagementClient } from '@azure/arm-containerinstance'
import { DefaultAzureCredential } from '@azure/identity'
import { Task, JobStatus, getJob } from '../GithubWebhook/github-jobs-repository'

const subscriptionId = process.env['AZURE_SUBSCRIPTION_ID']
const client = new ContainerInstanceManagementClient(new DefaultAzureCredential(), subscriptionId);

const queueTrigger: AzureFunction = async function (context: Context, jobId: string): Promise<void> {

    const jobDetails = await getJob(jobId)
    switch (jobDetails.status) {
        case JobStatus.Pending:
            await client.containerGroups.beginCreateOrUpdateAndWait(
                process.env['AZURE_RESOURCE_GROUP'] as string,
                `gh-${jobDetails.rowKey}`,
                {
                    location: 'eastus',
                    osType: 'Linux',
                    containers: [
                        {
                            image: 'myoung34/github-runner',
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
            break;
        case JobStatus.Completed:
            context.log('Detected job completion. Deleting container for job-id: {id}', jobDetails.rowKey)
            await client.containerGroups.beginDeleteAndWait(
                process.env['AZURE_RESOURCE_GROUP'] as string,
                `gh-${jobDetails.rowKey}`,
            )
            break;
    }

    context.log('Queue trigger function processed work item', jobId);
};

export default queueTrigger;
