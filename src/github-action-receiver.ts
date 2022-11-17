context.log('HTTP trigger function processed a request.');

const hmac = crypto.createHmac("sha1", process.env["GITHUB_SECRET"]);
const signature = hmac.update(JSON.stringify(req.body)).digest('hex');
const shaSignature = `sha1=${signature}`;
context.log(`calculated signature: ${shaSignature}`);

const gitHubSignature = req.headers['x-hub-signature'];
context.log(`signature header: ${gitHubSignature}`);

if (shaSignature.localeCompare(gitHubSignature)) {
    context.log("Signatures do not match!");
    context.res = {
        status: 401,
        body: "Signatures don't match"
    };
} else {
    context.log("Signatures match - proceeding!");
    const action = req.body?.action;
    
    // verify that we have a payload with an action property
    if (action) {
        context.log(`Acknowledge receipt of ${action} event.`);
    } else {
        context.res = {
            status: 400,
            body: "Expected 'workflow_job' payload"
        };
        return;
    }

    // ignore 'in_progress' action
    if (action === "in_progress") {
        const msg = "Nothing to do for 'in_progress' event";
        context.log(msg);
        context.res = {
            body: msg
        };
        return;
    }
    
    // extract required metadata
    const org = req.body?.organization?.login;
    const repo = req.body?.repository?.name;
    const actor = req.body?.sender?.login;
    const labels = req.body?.workflow_job?.labels as string[];

    // log info
    context.log(`Action: ${action}, org: ${org}, repo: ${repo}, sender: ${actor}, labels: ${labels}`);
    
    // check if the ignore label matches
    const ignoreLabel = process.env["IGNORE_LABEL"].toLocaleLowerCase();
    if (!ignoreLabel) {
        const msg = "No 'IGNORE_LABEL' value is set. Please set this value.";
        context.log(msg);
        context.res = {
            status: 400,
            body: msg
        };
        return;
    }

    if (labels.length === 0) {
        const msg = `No labels supplied, so ignoring this event`;
        context.log(msg);
        context.res = {
            body: msg
        };
        return;
    }

    if (labels.findIndex(l => l.toLocaleLowerCase() === ignoreLabel) > -1) {
        const msg = `Found label ${ignoreLabel} so ignoring this event`;
        context.log(msg);
        context.res = {
            body: msg
        };
        return;
    } else {
        context.log(`No label = '${ignoreLabel}' found - proceeding`);
    }
    
    // invoke the workflow to handle the scale up/scale down action
    context.log(`Executing action ${action}`);
    const dispatch = await triggerAction(context, org, repo, action, actor, labels);
    context.res = {
        status: dispatch.status,
        body: `Invoked workflow ${process.env["EPHEMERAL_SPINNER_WORKFLOW"]}. Data: ${dispatch.data}`
    };
}