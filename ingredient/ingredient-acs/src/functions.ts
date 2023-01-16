import {BaseUtility, IngredientManager} from '@azbake/core'
import {CommunicationServiceManagementClient} from '@azure/arm-communication'
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"

export class AcsUtils extends BaseUtility {


    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const st_profile = util.create_resource_name("st", null, false);
        return st_profile;
    }

    public async get_primary_key(name: string, rg: string | null = null) : Promise<string> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        const client = new CommunicationServiceManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.storageAccounts.listKeys(resource_group, name)

        let key: string = ""
        if (response.keys)
        {
            key = response.keys[0].value || ""
        }
        return key
    }

    public async get_secondary_key(name: string, rg: string | null = null) : Promise<string> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        const client = new CommunicationServiceManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.storageAccounts.listKeys(resource_group, name)

        let key: string = ""
        if (response.keys)
        {
            key = response.keys[1].value || ""
        }
        return key
    }

    public async get_primary_connectionstring(name: string, rg: string | null = null) : Promise<string> {
        let key: string = ""

        key = await this.get_primary_key(name, rg);
    

        let connectionString = `DefaultEndpointsProtocol=https;AccountName=${name};AccountKey=${key};`        
        
        return connectionString;
    }

    public async get_secondary_connectionstring(name: string, rg: string | null = null) : Promise<string> {
        let key: string = ""

        key = await this.get_secondary_key(name, rg);

        let connectionString = `DefaultEndpointsProtocol=https;AccountName=${name};AccountKey=${key};`        
        
        return connectionString;        
    }
}

