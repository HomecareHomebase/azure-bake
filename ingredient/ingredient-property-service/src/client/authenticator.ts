import { Logger } from "@azbake/core"

import { AzureTokenCredentialsOptions, ApplicationTokenCredentials, loginWithServicePrincipalSecret } from "@azure/ms-rest-nodeauth";
import { TokenResponse } from "@azure/ms-rest-nodeauth/dist/lib/credentials/tokenClientCredentials";

export class Authenticator {

    private readonly _logger: Logger;

    constructor(logger: Logger) {
        this._logger = logger;
    }

    public async Authenticate(clientId: string, clientSecret: string, domain: string, resource: string): Promise<string> {
        const tokenOptions: AzureTokenCredentialsOptions = <AzureTokenCredentialsOptions>{
            tokenAudience: resource
        };

        let credentials: ApplicationTokenCredentials = await loginWithServicePrincipalSecret(clientId, clientSecret, domain, tokenOptions).catch((err) => {
            this._logger.error('Authentication to Azure AD failed: ' + err);
            throw err;
        });

        let response: TokenResponse = await credentials.getToken();

        if (!response.accessToken || response.accessToken.length == 0) {
            this._logger.error('Authentication to Azure AD was successful but the access token is null or empty');
            throw new Error('Authentication to Azure AD was successful but the access token is null or empty')
        }

        this._logger.log('Authentication to Azure AD was successful');
        return response.accessToken;
    }
}