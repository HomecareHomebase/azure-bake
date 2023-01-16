import {BaseUtility, IngredientManager} from '@azbake/core'
import {CommunicationServiceManagementClient} from '@azure/arm-communication'
import { DefaultAzureCredential, ClientSecretCredential,ChainedTokenCredential } from "@azure/identity";
export class AcsUtils extends BaseUtility {

    private token = new ClientSecretCredential(this.context.AuthToken.domain, this.context.AuthToken.clientId, this.context.AuthToken.secret);
    private credential = new ChainedTokenCredential(this.token, new DefaultAzureCredential());

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const st_profile = util.create_resource_name("st", null, false);
        return st_profile;
    }

    public async get_primary_connectionstring(name: string, rg: string | null = null) : Promise<string> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

       const client = new CommunicationServiceManagementClient(this.credential, this.context.Environment.authentication.subscriptionId);

        let response = await client.communicationService.listKeys(resource_group, name)

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

       const client = new CommunicationServiceManagementClient(this.credential, this.context.Environment.authentication.subscriptionId);

        let response = await client.communicationService.listKeys(resource_group, name)

        let key: string = ""
        if (response.secondaryConnectionString)
        {
            key =  response.secondaryConnectionString || ""
        }
        return key
    }
 

}

