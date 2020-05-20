import { Logger } from "@azbake/core";

import { OperationBase, PropertyOperation, SecretOperation } from ".";//, EncryptionKeyOperation, CertificateOperation } from ".";
import { ClientFactory } from "../client";
import { PropertyServiceConfiguration } from "../configuration";

export class OperationFactory {

    private readonly _logger: Logger;
    private readonly _clientFactory: ClientFactory;

    public constructor(logger: Logger, clientFactory: ClientFactory) {
        this._logger = logger;
        this._clientFactory = clientFactory;
    }

    public CreateOperations(configuration: PropertyServiceConfiguration): Array<OperationBase<any, any, any>> {

        const operations: Array<OperationBase<any, any, any>> = [];

        if (configuration.PropertyConfiguration) {
            operations.push(new PropertyOperation(this._logger, this._clientFactory.CreatePropertyClient(), configuration.PropertyConfiguration));
            this._logger.log('Loaded property operation');
        }

        if (configuration.SecretConfiguration) {
            operations.push(new SecretOperation(this._logger, this._clientFactory.CreateSecretClient(), configuration.SecretConfiguration));
            this._logger.log('Loaded secret operation');
        }

        // if (configuration.EncryptionKeyConfiguration) {
        //     operations.push(new EncryptionKeyOperation(this._logger, this._clientFactory.CreateEncryptionKeyClient(), configuration.EncryptionKeyConfiguration));
        //     this._logger.log('Loaded encryptionkey operation');
        // }

        // if (configuration.CertificateConfiguration) {
        //     operations.push(new CertificateOperation(this._logger, this._clientFactory.CreateCertificateClient(), configuration.CertificateConfiguration));

        //     this._logger.log('Loaded certificate operation');
        // }

        return operations;
    }
}