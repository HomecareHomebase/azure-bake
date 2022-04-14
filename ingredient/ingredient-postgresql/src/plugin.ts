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
        this._access = this._ingredient.properties.parameters.get("access")?._value.toLowerCase();
        this._armTemplate = (this._access == "public") ? PublicAccessARMTemplate
            : (this._access == "private") ? PrivateAccessARMTemplate
            : null;
    }

    _helper: ARMHelper;
    _functions: PostgreSQLDBUtils; 
    private _access: string;
    private _armTemplate: any;

    public async Execute(): Promise<void> {
        try {
            var params = await this._helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            this.validateBakeParams(params);

        } catch (error){
            this._logger.error('Bake validation failed: ' + error)
            throw error;
        }

        var vnetData = await this.getVnetData(params);
        params.vnetData = vnetData;

        if (this._access == "private")
        {
            // The Private ARM template includes a few Microsoft.Resources/deployments which should be uniquely named
            let timestamp = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, "");
            params.virtualNetworkDeploymentName = {value: `virtualNetwork_${timestamp}`};
            params.virtualNetworkLinkDeploymentName = {value: `virtualNetworkLink_${timestamp}`};
            params.privateDnsZoneDeploymentName = {value: `privateDnsZone_${timestamp}`};
            
            // Hard coding this for security
            params.publicNetworkAccess = {value: 'Disabled'};
        }

        if (!params.firewallRules)
        {
            params.firewallRules = {value: {rules: [] }};
        }

        this.trimParametersForARM(params);

        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);
            this._logger.log('PostgreSQL Plugin Logging: ' + this._ingredient.properties.parameters)
            await this._helper.DeployTemplate(this._name, this._armTemplate, params, await util.resource_group())
        } catch(error){
            this._logger.error('Deployment failed: ' + error)
            throw error
        }
    }

    private async getVnetData(params: any): Promise<VnetData> {
        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);

        let vNet: VirtualNetwork = await this._functions.get_vnet(params.virtualNetworkResourceGroup.value, params.virtualNetworkName.value)
        let subnetPropertiesGet: Subnet = await this._functions.get_subnet(params.virtualNetworkResourceGroup.value, params.virtualNetworkName.value, params.subnetName.value)
        let privateDnsZoneName = this._functions.create_resource_uri(this._access); 
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
                location: vNet.location!,
                subscriptionId: this._ctx.Environment.authentication.subscriptionId,
                subnetProperties: subnetPropertiesGet,
                subnetNeedsUpdate: false,
                isNewVnet: false,
                usePrivateDnsZone: (this._access === "private"),
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

    private validateBakeParams(params: any) {
        const validAccesses = ["public", "private"];
        if (!validAccesses.includes(this._access)) throw new Error("Parameter 'access' must be set to \"public\" or \"private\".");
        
        // This gets checked by the regular ARM validation anyway but might as well catch it early here.
        if (!params.serverName || !params.administratorLogin || !params.administratorLoginPassword) {
            throw new Error("serverName, administratorLogin, and administratorLoginPassword must be defined in the Bake parameters.");
        }

        // private access requires some special data for subnet
        if (this._access == "private") {
            if (!params.subnetName || !params.virtualNetworkName || !params.virtualNetworkResourceGroup) {
                throw new Error("subnetName, virtualNetworkName, and virtualNetworkResourceGroup must be defined in the Bake Parameters for 'private' access");
            } 
        }
    }

    // Remove parameters that are not defined in the ARM template. We call for extra params in the YAML so we can fetch necessary objects for ARM parameters like vNetData.
    private trimParametersForARM(params: any) {
        for (var param in params) {
            if (!this._armTemplate.parameters.hasOwnProperty(param)) {
                delete params[param];
            }
        }
    }
}
