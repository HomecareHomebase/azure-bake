import {BaseUtility, IngredientManager} from '@azbake/core'
import {CommunicationServiceManagementClient} from '@azure/arm-communication'
export class AcsUtils extends BaseUtility {


    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const st_profile = util.create_resource_name("st", null, false);
        return st_profile;
    }

    public async get_primary_connectionstring(name: string, rg: string | null = null) : Promise<string> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        // The communication client needs a token credential, instead of the auth. https://learn.microsoft.com/en-us/java/api/com.azure.core.credential.tokencredential?source=recommendations&view=azure-java-stable
        
        const client = new CommunicationServiceManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.communicationService.listKeys(resource_group, name)

        let key: string = ""
        if (response.primaryConnectionString)
        {
            return response.primaryConnectionString
        }
        return key
    }
 

}

