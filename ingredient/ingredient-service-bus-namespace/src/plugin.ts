import { BaseIngredient, IngredientManager, IIngredient, DeploymentContext } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import { ServiceBusManagementClient } from "@azure/arm-servicebus";
import ARMTemplate from "./arm.json"
export class ServiceBusNamespace extends BaseIngredient {

    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);

        this._sbmClient = new ServiceBusManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId);
    }

    private readonly _sbmClient: ServiceBusManagementClient;

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx);
            this._logger.log('Service Bus Namespace Plugin Logging: ' + this._ingredient.properties.source);

            const helper = new ARMHelper(this._ctx);

            let armParameters = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters);

            let name = armParameters['name'] ? armParameters['name'].value : undefined;
            let skuName = armParameters['skuName'] ? armParameters['skuName'].value : undefined;
            let secondaryName = armParameters['secondaryName'] ? armParameters['secondaryName'].value : undefined;
            let secondaryLocation = armParameters['secondaryLocation'] ? armParameters['secondaryLocation'].value : undefined;
            let aliasName = armParameters['aliasName'] ? armParameters['aliasName'].value : undefined;
            let resourceGroupName = await util.resource_group();

            if (skuName == 'Premium' &&
                secondaryName && secondaryName != '' &&
                secondaryLocation && secondaryLocation != '' &&
                aliasName && aliasName != '') {
                try
                {
                    let drResponse = await this._sbmClient.disasterRecoveryConfigs.get(resourceGroupName, name, aliasName);

                    if (drResponse.provisioningState == 'Succeeded' && drResponse.partnerNamespace != '') {
                        await this._sbmClient.disasterRecoveryConfigs.breakPairing(resourceGroupName, name, aliasName);
                    } else {
                        this._logger.log('Pairing is already broken.');
                    }
                } catch(error)
                {
                    if (error.statusCode == 404) {
                        this._logger.log('Alias not found. Skipping the breaking of pairing.');
                    } else {
                        throw error;
                    }
                }
            }

            await helper.DeployTemplate(this._name, ARMTemplate, armParameters, resourceGroupName)
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}