import { DeploymentContext, IIngredient, BaseIngredient } from '@azbake/core'

import { PropertyServiceClient, PropertyServiceClientAuthenticator } from './serviceclient'
import { ConfigurationValueResolver, ConfigurationProvider, PropertyServiceConfiguration, IOperationConfiguration } from './configuration'
import { ServerOperation, PropertyOperation, SecretOperation, EncryptionKeyOperation, CertificateOperation } from './operations'

import { ApplicationTokenCredentials } from '@azure/ms-rest-nodeauth';


export class PropertyServicePlugIn extends BaseIngredient {

    private readonly _valueResolver: ConfigurationValueResolver;
    private readonly _configurationProvider: ConfigurationProvider;
    private readonly _authenticator: PropertyServiceClientAuthenticator;

    private readonly _baseUrl: string = `https://property-hchb-shared.k8s-dev.hchb.local`;

    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx)

        this._valueResolver = new ConfigurationValueResolver(this._logger, this._ctx, this._ingredient);
        this._configurationProvider = new ConfigurationProvider(this._logger, this._valueResolver);
        this._authenticator = new PropertyServiceClientAuthenticator(this._logger);
    }

    public async Execute(): Promise<void> {

        try {
            let operations: Array<ServerOperation<any, any, any, any>> = await this.Initialize();
            await this.Run(operations);
        }
        catch (error) {
            this._logger.error('deployment failed: ' + error);
            throw error
        }
    }

    private async Initialize(): Promise<Array<ServerOperation<any, any, any, any>>> {

        this._logger.log('Begin Propery Service Plugin Initalization'.cyan);

        let configuration: PropertyServiceConfiguration = await this._configurationProvider.LoadConfiguration();
        let client: PropertyServiceClient = await this.InitializeClient();

        let operations: Array<ServerOperation<any, any, any, any>> = await this.InitializeOperations(configuration, client);

        this._logger.log('End Propery Service Plugin Initalization'.cyan);

        return operations;
    }

    private async InitializeOperations(configuration: PropertyServiceConfiguration, client: PropertyServiceClient): Promise<Array<ServerOperation<any, any, any, any>>> {

        if (!configuration) {
            throw new Error('configuration is null.')
        }
        if (!client) {
            throw new Error('client is null.')
        }

        this._logger.log('Begin loading operations'.cyan);

        let operations: Array<ServerOperation<any, any, any, any>> = [];

        if (configuration.PropertyConfiguration) {
            operations.push(new PropertyOperation(this._logger, client, this._valueResolver, configuration.PropertyConfiguration));
            this._logger.log('Loaded property operation');
        }

        if (configuration.SecretConfiguration) {
            operations.push(new SecretOperation(this._logger, client, this._valueResolver, configuration.SecretConfiguration));
            this._logger.log('Loaded secret operation');
        }

        if (configuration.EncryptionKeyConfiguration) {
            operations.push(new EncryptionKeyOperation(this._logger, client, this._valueResolver, configuration.EncryptionKeyConfiguration));
            this._logger.log('Loaded encryptionkey operation');
        }

        if (configuration.CertificateConfiguration) {
            operations.push(new CertificateOperation(this._logger, client, this._valueResolver, configuration.CertificateConfiguration));
            this._logger.log('Loaded certificate operation');
        }

        if (operations.length == 0) {
            this._logger.error('Failed to load operations');
            throw new Error('Failed to load operations');
        }

        this._logger.log(`Loaded ${operations.length} operations successfully`);
        this._logger.log('End loading operations'.cyan);

        return operations;
    }

    private async InitializeClient(): Promise<PropertyServiceClient> {
        this._logger.log('Begin creating service client'.cyan);

        let credentials: ApplicationTokenCredentials = await this._authenticator.Authenticate();
        let client = new PropertyServiceClient(this._logger, this._baseUrl, credentials);

        this._logger.log('Service client initialization was successful');

        this._logger.log('End creating service client'.cyan);

        return client;
    }

    private async Run(operations: Array<ServerOperation<any, any, any, any>>): Promise<void> {

        if (!operations) {
            throw new Error('operations is null.')
        }

        this._logger.log('Begin Property service communication'.cyan);

        for (let index = 0; index < operations.length; index++) {
            this._logger.log(`Begin executing ${operations[index].TypeName.toLowerCase()} operations`);

            await operations[index].Execute();

            this._logger.log(`End executing ${operations[index].TypeName.toLowerCase()} operations`);
        }

        this._logger.log('End Property service communication'.cyan);
    }
}