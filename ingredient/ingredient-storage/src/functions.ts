import {BaseUtility, IngredientManager} from '@azbake/core'
import { StorageManagementClient, ManagementPolicies } from '@azure/arm-storage'
import { StorageAccountsGetPropertiesResponse, StorageAccount, Endpoints, ManagementPolicySchema, ManagementPolicyRule, ManagementPolicyDefinition, ManagementPolicyFilter, ManagementPolicyAction, ManagementPolicyBaseBlob, DateAfterModification } from '@azure/arm-storage/esm/models'
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

    /**
     * Creates a delete policy rule for blob lifecycle management.
     * Supports global policies (all blobs), container-level, path-level, or tag-based filtering.
     * 
     * @param name - The name of the policy rule (must be unique within the policy, up to 256 alphanumeric characters)
     * @param enabled - Whether the rule is enabled
     * @param daysAfter - Number of days after last modification to delete the blob
     * @param options - Optional filtering options for container/path/tag-based TTL policies
     * @param options.prefixMatch - Array of prefix strings to filter blobs (e.g., ["container1/", "container2/subfolder/"])
     *                              Each prefix must start with a container name. Up to 10 prefixes per rule.
     * @param options.blobIndexMatch - Array of blob index tag conditions for filtering (e.g., [{ name: "status", op: "==", value: "archived" }])
     * @param options.blobTypes - Array of blob types to apply the policy to. Defaults to ["blockBlob"]. Valid: "blockBlob", "appendBlob"
     * @returns ManagementPolicyRule configured with the specified filters
     * 
     * @example
     * // Global delete policy - applies to all blockBlobs in the storage account
     * const globalRule = storage.add_delete_policy("delete-all", true, 90);
     * 
     * @example
     * // Container-level TTL - delete blobs in 'logs' container after 30 days
     * const logsRule = storage.add_delete_policy("delete-logs", true, 30, { prefixMatch: ["logs/"] });
     * 
     * @example
     * // Path-level TTL - delete blobs in specific subfolders after 7 days
     * const tempRule = storage.add_delete_policy("delete-temp", true, 7, { prefixMatch: ["data/temp/", "cache/"] });
     * 
     * @example
     * // Tag-based filtering - delete blobs tagged as "archived" in 'reports' container after 14 days
     * const tagRule = storage.add_delete_policy("delete-archived", true, 14, {
     *   prefixMatch: ["reports/"],
     *   blobIndexMatch: [{ name: "status", op: "==", value: "archived" }]
     * });
     * 
     * @example
     * // Include appendBlobs in the policy
     * const rule = storage.add_delete_policy("delete-all-types", true, 30, { 
     *   prefixMatch: ["logs/"],
     *   blobTypes: ["blockBlob", "appendBlob"] 
     * });
     */
    public add_delete_policy(
        name: string, 
        enabled: boolean, 
        daysAfter: number,
        options: {
            prefixMatch?: string[];
            blobIndexMatch?: Array<{ name: string; op: string; value: string }>;
            blobTypes?: ("blockBlob" | "appendBlob")[];
        } = {}
    ) : ManagementPolicyRule {
        const rule = <ManagementPolicyRule>{
            name: name,
            enabled: enabled,
        };

        const filters: ManagementPolicyFilter = {
            blobTypes: options.blobTypes || ["blockBlob"]
        };

        if (options.prefixMatch && options.prefixMatch.length > 0) {
            filters.prefixMatch = options.prefixMatch;
        }

        if (options.blobIndexMatch && options.blobIndexMatch.length > 0) {
            filters.blobIndexMatch = options.blobIndexMatch;
        }

        rule.definition = <ManagementPolicyDefinition>{
            filters: filters,
            actions: <ManagementPolicyAction>{
                baseBlob : <ManagementPolicyBaseBlob>{
                    deleteProperty: <DateAfterModification>{
                        daysAfterModificationGreaterThan : daysAfter
                    }
                }
            }
        };
        return rule;
    }

    public create_policy(... rules : ManagementPolicyRule[]): ManagementPolicySchema {
        const policy = <ManagementPolicySchema>{
            rules: rules
        };
        return policy;
    }

    public async get_container(account: BakeStorageAccount, container: string, accessLevel?: "container" | "blob" | undefined, policy?: ManagementPolicySchema | undefined): Promise<BakeStorageContainer | null>{
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

        if (policy)
        {
            const mgmtClient = new StorageManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);

            // ensure the policies are tied to the container via filters
            if (policy.rules) {
                for(let i=0; i < policy.rules.length; ++i){
                    let rule = policy.rules[i]
                    
                    rule.definition.filters!.prefixMatch = [container + "/"]
                }
            }

            await mgmtClient.managementPolicies.createOrUpdate(account.rg, account.name, policy);    
        }


        const bakeContainer : BakeStorageContainer =  {
            account : account,
            container: container
        }
        return bakeContainer
    }
}