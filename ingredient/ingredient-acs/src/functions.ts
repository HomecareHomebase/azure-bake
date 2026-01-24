import { BaseUtility, IngredientManager } from '@azbake/core'
import { CommunicationServiceManagementClient } from '@azure/arm-communication'

type CommunicationClientFactory = (credentials: any, subscriptionId: string) => CommunicationServiceManagementClient;

export class AcsUtils extends BaseUtility {

    private readonly _clientFactory: CommunicationClientFactory;

    constructor(ctx: any, clientFactory?: CommunicationClientFactory) {
        super(ctx);
        this._clientFactory = clientFactory ?? ((credentials, subscriptionId) => {
            return new CommunicationServiceManagementClient(credentials, subscriptionId);
        });
    }

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let env = this.context.Environment.environmentCode;
        const st_profile = util.create_resource_name("acs", null, false);
        return st_profile;
    }

    public async get_primary_connectionstring(name: string, rg: string | null = null) : Promise<string> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        const client = this._clientFactory(this.context.Credentials.modernCredentials, this.context.Environment.authentication.subscriptionId);

        let response = await client.communicationServices.listKeys(resource_group, name)

        let key: string = ""
        if (response.primaryConnectionString)
        {
            key =  response.primaryConnectionString || ""
        }
        return key
    }

    public async get_secondary_connectionstring(name: string, rg: string | null = null) : Promise<string> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        const client = this._clientFactory(this.context.Credentials.modernCredentials, this.context.Environment.authentication.subscriptionId);

        let response = await client.communicationServices.listKeys(resource_group, name)

        let key: string = ""
        if (response.secondaryConnectionString)
        {
            key =  response.secondaryConnectionString || ""
        }
        return key
    }
 

}

