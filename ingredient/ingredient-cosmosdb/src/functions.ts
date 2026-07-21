import {BaseUtility, IngredientManager} from '@azbake/core'
import { CosmosDBManagementClient, CosmosDBManagementModels, CosmosDBManagementMappers } from "@azure/arm-cosmosdb";
import { ApplicationTokenCredentials } from '@azure/ms-rest-nodeauth';
import { HttpHeaders }  from "@azure/ms-rest-js"
import { request } from 'http';
import { ClientHttp2Session, Http2ServerRequest } from 'http2';
import { Credentials } from 'crypto';


export class CosmosUtility extends BaseUtility {

 
    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);

        const name = util.create_resource_name("cosms", null, true);
        return name;
    }

    // Environment-independent Property Service secret name for a cosmos account connection
    // string. The account's region code is retained so per-region accounts (active/active or
    // active/passive) map to distinct secrets rather than colliding on a single name.
    public get_connectionstring_property_name(account: string): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        return util.canonical_resource_name(account) + "-connectionstring";
    }

    // Environment-independent Property Service secret name for a cosmos account primary key.
    // The account's region code is retained so per-region accounts (active/active or
    // active/passive) map to distinct secrets rather than colliding on a single name.
    public get_key_property_name(account: string): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context);
        return util.canonical_resource_name(account) + "-key";
    }
    public async get_primary_key(name: string, rg: string | null = null) : Promise<string> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        const client = new CosmosDBManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.databaseAccounts.listKeys(resource_group, name)

        let key: string = ""
        if (response.primaryMasterKey)
        {
            key = response.primaryMasterKey || ""
        }
        return key
    }
    public async get_secondary_key(name: string, rg: string | null = null) : Promise<string> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        const client = new CosmosDBManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

        let response = await client.databaseAccounts.listKeys(resource_group, name)

        let key: string = ""
        if (response.secondaryMasterKey)
        {
            key = response.secondaryMasterKey || ""
        }
        return key
    }

    public async get_primary_connectionstring(name: string, rg: string | null = null) : Promise<string> {
        
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()
  
        const client = new CosmosDBManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let response = await client.databaseAccounts.listConnectionStrings(resource_group,name)

        let connectionString : string =""
        if(response.connectionStrings)
        {
            response.connectionStrings.forEach( function (cs)
            {
                if (cs.description == "Primary SQL Connection String" && cs.connectionString)
                {
                    connectionString = cs.connectionString
                }      
            })
        }

        return connectionString;
    }

    public async get_secondary_connectionstring(name: string, rg: string | null = null) : Promise<string> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()
  
        const client = new CosmosDBManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let response = await client.databaseAccounts.listConnectionStrings(resource_group,name)

        let connectionString : string =""
        if(response.connectionStrings)
        {
            response.connectionStrings.forEach( function(cs)
            {
                if (cs.description == "Secondary SQL Connection String" && cs.connectionString)
                {
                    connectionString = cs.connectionString
                }
            })
        }

        return connectionString;
    }
}