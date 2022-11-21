import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { handleWebHook } from './github-action-receiver'

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.res = await handleWebHook(req.body, req.headers['x-hub-signature'], m => context.bindings.msg = m, context.log)

};

export default httpTrigger;