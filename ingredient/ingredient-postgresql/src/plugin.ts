import { BaseIngredient, IngredientManager,IIngredient,DeploymentContext } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import { PostgreSQLDBUtils } from "./functions"
import { VnetData } from "./vnetData"
import PublicAccessARMTemplate from "./PublicAccessArm.json" 
import PrivateAccessARMTemplate from "./PrivateAccessArm.json"
import { Subnet,VirtualNetwork } from "@azure/arm-network/esm/models"

export class PostgreSQLDB extends BaseIngredient {

    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
        this._helper = new ARMHelper(this._ctx);
        this._functions = new PostgreSQLDBUtils(this._ctx);
    }

    _helper: ARMHelper;
    _functions: PostgreSQLDBUtils; // Might remove this later and put all the "function" logic in the bake yaml.

    public async Execute(): Promise<void> {
        try {
            var params = await this._helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

            var ARMTemplate = (params.access.value == "public") ? PublicAccessARMTemplate
                : (params.access.value == "private") ? PrivateAccessARMTemplate
                : null;
            
            if (ARMTemplate == null) throw new Error("Parameter 'access' must be set to \"public\" or \"private\".");

            // TODO add a lot more validation here. eg if private and missing vnetname or subnetname or they don't exist
        } catch (error){
            this._logger.error('Bake validation failed: ' + error)
            throw error;
        }

        const vnetData = await this.getVnetData(params);

        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);
            this._logger.log('PostgreSQL Plugin Logging: ' + this._ingredient.properties.parameters)

            await this._helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())

        } catch(error){
            this._logger.error('Deployment failed: ' + error)
            throw error
        }
    }

    public async getVnetData(params: any): Promise<VnetData> {
        //var data: any = {}};
        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);

        let vNet: VirtualNetwork = await this._functions.get_vnet(params.virtualNetworkResourceGroup.value, params.virtualNetworkName.value)
        let subnetPropertiesGet: Subnet = await this._functions.get_subnet(params.virtualNetworkResourceGroup.value, params.virtualNetworkName.value, params.subnetName.value)
        let privateDnsZoneName = this._functions.create_resource_uri(params.access); // todo investigate public equivalent.
        let dnsZone = await this._functions.get_private_dns_zone(params.virtualNetworkResourceGroup.value, privateDnsZoneName)
        let dnsZoneIsNew: boolean = false;

        // if dnsZone doesn't exist, generate its id
        if (dnsZone === undefined)
        {
            dnsZoneIsNew = true;
            dnsZone = { id: `/subscriptions/${this._ctx.Environment.authentication.subscriptionId}/resourceGroups/${params.virtualNetworkResourceGroup.value}` +
                `/providers/Microsoft.Network/privateDnsZones/${privateDnsZoneName}`};
        }
        
        let vnetData: VnetData = {
            value: {
                virtualNetworkName: params.virtualNetworkName.value,
                virtualNetworkId: vNet.id!,
                subnetName: params.subnetName.value,
                virtualNetworkAddressPrefix: subnetPropertiesGet.addressPrefix!,
                virtualNetworkResourceGroupName: params.virtualNetworkResourceGroup.value,
                location: await util.current_region(), // maybe primary_region()?
                subscriptionId: this._ctx.Environment.authentication.subscriptionId,
                subnetProperties: subnetPropertiesGet,
                subnetNeedsUpdate: false,
                isNewVnet: false,
                usePrivateDnsZone: (params.access === "private"),
                isNewPrivateDnsZone: dnsZoneIsNew, 
                privateDnsResourceGroup: params.virtualNetworkResourceGroup.value,
                privateDnsSubscriptionId: this._ctx.Environment.authentication.subscriptionId,
                privateDnsZoneName: privateDnsZoneName,
                linkVirtualNetwork: true,
                Network: {
                    DelegatedSubnetResourceId: subnetPropertiesGet.id!,
                    PrivateDnsZoneArmResourceId: dnsZone.id 
                }
            }
        };

        return vnetData;
    }


}