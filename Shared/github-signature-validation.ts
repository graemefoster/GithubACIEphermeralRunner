import { createHmac } from 'crypto'
import { Logger } from './github-jobs-repository'

export function validateGithubSignature(body: any, signatureHeader: string, logger: Logger): boolean {

    logger('Validating incoming signature')

    const hmac = createHmac("sha1", process.env["GITHUB_WEBHOOK_SECRET"] as string);
    const signature = hmac.update(JSON.stringify(body ?? {})).digest('hex');
    const shaSignature = `sha1=${signature}`;

    const gitHubSignature = signatureHeader

    const isOk = shaSignature.localeCompare(gitHubSignature) == 0
    if (isOk) {
        logger('Successfully validated incoming Github Action signature')
    } else {
        logger('Failed to validate incoming Github Action signature. Please confirm GITHUB_WEBHOOK_SECRET env variable is set, and matches secret in Github Actions for the webhook')
    }
    return isOk
}
