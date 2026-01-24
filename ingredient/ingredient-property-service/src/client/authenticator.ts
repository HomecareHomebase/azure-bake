import { Logger } from "@azbake/core"

import identity = require("@azure/identity");

type CredentialFactory = (tenantId: string, clientId: string, clientSecret: string) => identity.TokenCredential;

export class Authenticator {

    private readonly _logger: Logger;
    private readonly _credentialFactory: CredentialFactory;

    constructor(logger: Logger, credentialFactory?: CredentialFactory) {
        this._logger = logger;
        this._credentialFactory = credentialFactory ?? ((tenantId, clientId, clientSecret) => {
            return new identity.ClientSecretCredential(tenantId, clientId, clientSecret);
        });
    }

    public async Authenticate(clientId: string, clientSecret: string, domain: string, resource: string): Promise<string> {
        const scope = this._normalizeScope(resource);
        const credential = this._credentialFactory(domain, clientId, clientSecret);

        const response = await credential.getToken(scope).catch((err) => {
            this._logger.error('Authentication to Azure AD failed: ' + err);
            throw err;
        });

        if (!response?.token || response.token.length == 0) {
            this._logger.error('Authentication to Azure AD was successful but the access token is null or empty');
            throw new Error('Authentication to Azure AD was successful but the access token is null or empty')
        }

        this._logger.log('Authentication to Azure AD was successful');
        return response.token;
    }

    private _normalizeScope(resource: string): string {
        const trimmed = (resource || '').trim();
        if (trimmed.length == 0 || trimmed.endsWith('.default')) {
            return trimmed;
        }

        if (trimmed.endsWith('/')) {
            return `${trimmed}.default`;
        }

        return `${trimmed}/.default`;
    }
}