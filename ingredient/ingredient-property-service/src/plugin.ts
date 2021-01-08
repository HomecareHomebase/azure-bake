import { DeploymentContext, IIngredient, BaseIngredient, IBakeAuthentication } from '@azbake/core'

import { ConfigurationProvider, ConfigurationValueResolver, PropertyServiceConfiguration } from './configuration';
import { ClientFactory, Authenticator, PropertyServiceSource } from './client';
import { OperationBase, } from './operations';
import { OperationFactory } from './operations/operationFactory';

export class PropertyServicePlugIn extends BaseIngredient {

    private readonly _valueResolver: ConfigurationValueResolver;
    private readonly _configurationProvider: ConfigurationProvider;

    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx)

        this._valueResolver = new ConfigurationValueResolver(this._logger, this._ctx, this._ingredient);
        this._configurationProvider = new ConfigurationProvider(this._logger, this._valueResolver);
    }

    public async Auth(auth: IBakeAuthentication): Promise<string | null> {

        const source: PropertyServiceSource = await PropertyServiceSource.Parse(this._ctx);
        const authenticator: Authenticator = new Authenticator(this._logger)

        return await authenticator.Authenticate(auth.serviceId, auth.secretKey, auth.tenantId, source.resourceUrl)
    }

    public async Execute(): Promise<void> {

        try {
            await this._initialize().then(async (operations) => {
                await this._runOperationLoop(operations);
            });
        }
        catch (error) {
            this._logger.error('deployment failed: ' + error);
            throw error
        }
    }

    private async _initialize(): Promise<Array<OperationBase<any, any, any>>> {

        this._logger.log('Begin Propery Service Plugin Initalization'.cyan);

        const configuration: PropertyServiceConfiguration = await this._configurationProvider.Initialize();
        const clientFactory: ClientFactory = await this._initializeClients();

        return Promise.resolve(this._initializeOperations(configuration, clientFactory));
    }

    private _initializeOperations(configuration: PropertyServiceConfiguration, clientFactory: ClientFactory): Array<OperationBase<any, any, any>> {

        this._logger.log('Begin loading operations'.cyan);

        const operationFactory: OperationFactory = new OperationFactory(this._logger, clientFactory);
        const operations: Array<OperationBase<any, any, any>> = operationFactory.CreateOperations(configuration);

        if (operations.length == 0) {
            this._logger.error('Failed to load operations');
            throw new Error('Failed to load operations');
        }

        this._logger.log(`Loaded [${operations.length}] operations successfully`);
        this._logger.log('End loading operations'.cyan);

        return operations;
    }

    private async _initializeClients(): Promise<ClientFactory> {
        this._logger.log('Begin creating service client'.cyan);

        const source: PropertyServiceSource = await PropertyServiceSource.Parse(this._ctx);

        this._logger.log(`Loaded baseUrl [${source.baseUrl}] from properties.source successfully`);

        const accessToken: string | null = this._ctx.CustomAuthToken;
        if (!accessToken || accessToken == '') {
            throw new Error('The access token is null or empty.');
        }

        this._logger.log('Loaded access token successfully');

        const factory: ClientFactory = new ClientFactory(this._logger, source.baseUrl, accessToken);

        this._logger.log('Service client initialization was successful');

        this._logger.log('End creating service client'.cyan);

        return factory;
    }

    private async _runOperationLoop(operations: Array<OperationBase<any, any, any>>): Promise<void> {

        this._logger.log('Begin Property service communication'.cyan);

        for (let index = 0; index < operations.length; index++) {
            this._logger.log(`Begin executing ${operations[index].TypeName.toLowerCase()} operations`);

            try {
                await operations[index].Execute();
            }
            catch(error) {
                this._logger.error(error);
            }

            this._logger.log(`End executing ${operations[index].TypeName.toLowerCase()} operations`);
        }

        this._logger.log('End Property service communication'.cyan);
    }
}