import crypto from 'crypto'
import { Request, Response } from 'express'

export interface WebHookResponse {
    status: number,
    body: string
}
export function handleWebHook(body: any, signatureHeader: string): WebHookResponse {

    const hmac = crypto.createHmac("sha1", process.env["GITHUB_WEBHOOK_SECRET"] as string);
    const signature = hmac.update(JSON.stringify(body)).digest('hex');
    const shaSignature = `sha1=${signature}`;

    const gitHubSignature = signatureHeader;

    if (shaSignature.localeCompare(gitHubSignature)) {
        return {
            status: 401,
            body: "Signatures don't match"
        };
    } else {
        const action = body?.action;

        // verify that we have a payload with an action property
        if (action) {
            console.log(`Acknowledge receipt of ${action} event.`);
        } else {
            return {
                status: 400,
                body: "Expected 'workflow_job' payload"
            }
        }

        // ignore 'in_progress' action
        if (action === "in_progress") {
            const msg = "Nothing to do for 'in_progress' event";
            console.log(msg);
            return {
                status: 200,
                body: msg
            }
        }

        // extract required metadata
        const org = body?.organization?.login;
        const repo = body?.repository?.name;
        const actor = body?.sender?.login;
        const labels = body?.workflow_job?.labels as string[]

        // log info
        console.log(`Action: ${action}, org: ${org}, repo: ${repo}, sender: ${actor}, labels: ${labels}`)

        if (labels.length === 0) {
            const msg = `No labels supplied, so ignoring this event`;
            console.log(msg);
            return {
                status: 200,
                body: msg
            }
        }

        // invoke the workflow to handle the scale up/scale down action
        console.log(`Executing action ${action}`);
        return {
            status: 200,
            body: `Interesting`
        }
    }
}