import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { handleWebHook } from './github-action-receiver'

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    context.res = await handleWebHook(req.body, req.headers['x-hub-signature'], m => context.bindings.msg = m)

};

export default httpTrigger;