import {BaseUtility, IngredientManager} from '@azbake/core'
import { StorageManagementClient } from '@azure/arm-storage'
import { StorageAccountsGetPropertiesResponse, StorageAccount, Endpoints } from '@azure/arm-storage/esm/models'
import {BlobServiceClient, StorageSharedKeyCredential, SignedIdentifier} from '@azure/storage-blob'

export class BakeStorageAccount {
    public endpoints?: Endpoints
    public name: string = ""
    public rg: string = ""
    public key: string = ""
}

export class BakeStorageContainer {
    public account?: BakeStorageAccount
    public container?: string
}

export class StorageUtils extends BaseUtility {

    public create_resource_name(): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const st_profile = util.create_resource_name("st", null, false);
        return st_profile;
    }

    public async get_primary_key(name: string, rg: string | null = null) : Promise<string> {
     
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        let resource_group = rg || await util.resource_group()

        const client = new StorageManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

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

        const client = new StorageManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

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

    public async get_storageaccount(resourceGroup: string, name: string): Promise<BakeStorageAccount> {
        var client = new StorageManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let storageAccount = await client.storageAccounts.getProperties(resourceGroup, name)

        const account = new BakeStorageAccount();
        account.endpoints = storageAccount.primaryEndpoints
        account.key = await this.get_primary_key(name, resourceGroup)
        account.name = name
        account.rg = resourceGroup
        return account;

    }

    public async get_container(account: BakeStorageAccount, container: string, accessLevel?: "container" | "blob" | undefined): Promise<BakeStorageContainer | null>{
        const endpoints = account.endpoints
        if (endpoints == undefined) return null
        if (endpoints.blob == undefined) return null

        const sharedKeyCredential = new StorageSharedKeyCredential(account.name, account.key);
        const blobClient = new BlobServiceClient(endpoints.blob, sharedKeyCredential);
        const containerClient = blobClient.getContainerClient(container)
        if (!( await containerClient.exists())) {
            const resp = await containerClient.create()
        }
        await containerClient.setAccessPolicy(accessLevel)
        const bakeContainer : BakeStorageContainer =  {
            account : account,
            container: container
        }
        return bakeContainer
    }
}