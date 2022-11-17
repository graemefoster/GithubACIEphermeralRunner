import crypto from 'crypto'

export function validateGithubSignature(body: any, signatureHeader: string): boolean {

    const hmac = crypto.createHmac("sha1", process.env["GITHUB_WEBHOOK_SECRET"] as string);
    const signature = hmac.update(JSON.stringify(body ?? {})).digest('hex');
    const shaSignature = `sha1=${signature}`;

    const gitHubSignature = signatureHeader;

    return shaSignature.localeCompare(gitHubSignature) == 0
}
