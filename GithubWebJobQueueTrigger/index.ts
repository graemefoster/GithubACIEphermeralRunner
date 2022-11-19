import { AzureFunction, Context } from "@azure/functions"
import { ContainerInstanceManagementClient } from '@azure/arm-containerinstance'
import { DefaultAzureCredential } from '@azure/identity'
import { Task, JobStatus } from '../GithubWebhook/github-jobs-repository'

const subscriptionId = process.env['AZURE_SUBSCRIPTION_ID']
const client = new ContainerInstanceManagementClient(new DefaultAzureCredential(), subscriptionId);

const queueTrigger: AzureFunction = async function (context: Context, jobId: string, jobDetails: Task): Promise<void> {

    switch (jobDetails.status) {
        case JobStatus.Pending:
            await client.containerGroups.beginCreateOrUpdateAndWait(
                process.env['AZURE_RESOURCE_GROUP'] as string,
                jobDetails.rowKey,
                {
                    osType: 'Linux',
                    containers: [
                        {
                            image: 'didstopia/github-actions-runner',
                            name: 'githubRunner',
                            resources: {
                                requests: {
                                    cpu: 1,
                                    memoryInGB: 2
                                }
                            },
                            environmentVariables: [
                                {
                                    name: 'RUNNER_NAME_PREFIX',
                                    value: 'aci-${aciName}'
                                },
                                {
                                    name: 'RUNNER_WORKDIR',
                                    value: '/tmp/github-runner'
                                },
                                {
                                    name: 'RUNNER_TOKEN',
                                    secureValue: process.env['GITHUB_PAT_TOKEN'] as string
                                },
                                {
                                    name: 'LABELS',
                                    value: process.env['GITHUB_RUNS_ON'] as string
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
        case JobStatus.Completed:
            context.log('Detected job completion. Deleting container for job-id: {id}', jobDetails.rowKey)
            await client.containerGroups.beginDeleteAndWait(
                process.env['AZURE_RESOURCE_GROUP'] as string,
                jobDetails.rowKey
            )
    }

    context.log('Queue trigger function processed work item', jobId);
};

export default queueTrigger;
