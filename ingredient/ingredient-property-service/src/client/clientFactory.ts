import { Logger } from "@azbake/core";

import { PropertyType } from "../propertyTypes";
import { ClientBase } from "./clientBase";
import { PropertyClient } from "./propertyClient";
import { SecretClient } from "./secretClient";
// import { EncryptionKeyClient } from "./encryptionKeyClient";
// import { CertificateClient } from "./certificateClient";

export class ClientFactory {

    private readonly _clients: Map<PropertyType, ClientBase<any>>;

    public constructor(logger: Logger, baseUrl: string, accessToken: string) {
        this._clients = this._initializeClients(logger, baseUrl, accessToken);
    }

    private _initializeClients(logger: Logger, baseUrl: string, accessToken: string): Map<PropertyType, ClientBase<any>> {

        const clients: Map<PropertyType, ClientBase<any>> = new Map<PropertyType, ClientBase<any>>();

        clients.set(PropertyType.Property, new PropertyClient(logger, baseUrl, accessToken));
        clients.set(PropertyType.Secret, new SecretClient(logger, baseUrl, accessToken));
        // clients.set(PropertyTypes.EncryptionKey, new EncryptionKeyClient(logger, baseUrl, accessToken));
        // clients.set(PropertyTypes.Certificate, new CertificateClient(logger, baseUrl, accessToken));

        return clients;
    }

    public CreateClient<TModel>(type: PropertyType): ClientBase<TModel> {

        const client = this._clients.get(type);
        if (!client) {
            throw new Error(`The specified type is not a valid client type. Type: ${type}`);
        }

        return client;
    }

    public CreatePropertyClient(): PropertyClient {
        return this.CreateClient(PropertyType.Property) as PropertyClient;
    }
    public CreateSecretClient(): SecretClient {
        return this.CreateClient(PropertyType.Secret) as SecretClient;
    }
    // public CreateEncryptionKeyClient(): EncryptionKeyClient {
    //     return this.CreateClient(PropertyTypes.EncryptionKey) as EncryptionKeyClient;
    // }
    // public CreateCertificateClient(): CertificateClient {
    //     return this.CreateClient(PropertyTypes.Certificate) as CertificateClient;
    // }
}
