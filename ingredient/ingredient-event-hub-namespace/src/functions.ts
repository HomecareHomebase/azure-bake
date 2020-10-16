import {BaseUtility, IngredientManager} from '@azbake/core'
import { EventHubManagementClient } from '@azure/arm-eventhub';
import { NamespacesGetAuthorizationRuleResponse } from '@azure/arm-eventhub/esm/models';

export class EventHubNamespaceUtils extends BaseUtility {

    public get_resource_name(shortName: string | null = null): string {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)

        //resource type, name, region enabled
        const fullName = util.create_resource_name("ehn", shortName, true);

        this.context._logger.debug(`EventHubNamespaceUtils.get_resource_name() returned ${fullName}`);

        return fullName;
    } 
    
    public async get_resource_profile(shortName: string | null = null, rgShortName: string | null = null): Promise<string> {
        let util = IngredientManager.getIngredientFunction("coreutils", this.context)
        const name = this.get_resource_name(shortName);
        const rg = await util.resource_group(rgShortName);
        const profile = `${rg}/${name}`;

        this.context._logger.debug(`EventHubNamespaceUtils.get_resource_profile() returned ${profile}`);
        return profile
    }

    public async get_authorizationrule(resourceGroup: string, nameSpace: string, authorizationRuleName: string): Promise<NamespacesGetAuthorizationRuleResponse> {

        let token: any = this.context.AuthToken;
        var client = new EventHubManagementClient(token, this.context.Environment.authentication.subscriptionId);
        let authRule = await client.namespaces.getAuthorizationRule(resourceGroup, nameSpace, authorizationRuleName)

        this.context._logger.debug(`EventHubNamespaceUtils.get_authorizationrule() returned ${JSON.stringify(authRule)}`);

        return authRule;
    }
}

