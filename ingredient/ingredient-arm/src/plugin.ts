import { BaseIngredient, IngredientManager } from "@azbake/core"
import { IIngredient,  DeploymentContext } from "@azbake/core";
import * as fs from 'fs'
import { ResourceManagementClient } from "@azure/arm-resources"
import { Deployment, DeploymentProperties } from "@azure/arm-resources/esm/models";

export class CustomArmIngredient extends BaseIngredient {
    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx)        
    }

    public async Execute(): Promise<string> {

        let chk = fs.existsSync(this._ingredient.properties.template)
        if (!chk) {
            this._logger.error('could not locate arm template: ' + this._ingredient.properties.template)
            return this._name
        }

        let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)

        try {

            this._logger.log('starting custom arm deployment for template: ' + this._ingredient.properties.template)

            //build the properties as a standard object.
            let props : any = {
            }

            this._ingredient.properties.parameters.forEach( (v,n)=>
            {
                props[n] = {
                    "value": v.value(this._ctx)
                }
                let p = n + "=" + v.value(this._ctx)
                this._logger.log('param: ' + p) 
            })

            let buffer = fs.readFileSync(this._ingredient.properties.template)
            let contents = buffer.toString()
            let deployment = <Deployment>{
                properties : <DeploymentProperties>{
                    template: JSON.parse(contents),
                    parameters: props,
                    mode: "Incremental"               
                }
            }

            let client = new ResourceManagementClient(this._ctx.AuthToken, this._ctx.Environment.authentication.subscriptionId)

            this._logger.log("validating deployment...")
            let validate = await client.deployments.validate(util.resource_group(), this._name, deployment)
            if (validate.error)
            {
                let errorMsg : string = "Validation failed (" + (validate.error.code || "unknown") + ")"
                if (validate.error.target){
                    errorMsg += "\nTarget: " + validate.error.target
                }
                if (validate.error.message) {
                    errorMsg += "\nMessage: " + validate.error.message
                }
                if (validate.error.details){
                    errorMsg += "\nDetails:"
                    validate.error.details.forEach(x=>{
                        errorMsg += "\n" + x.message
                    })
                }

                this._ctx.Logger.error(errorMsg)
                throw new Error('validate failed')
            }

            this._logger.log("starting deployment...")
            let result = await client.deployments.createOrUpdate(util.resource_group(), this._name, deployment)  
            if ( result._response.status >299){
                throw new Error('ARM error ' + result._response.bodyAsText)
            }

            this._logger.log('deployment finished')
            return this._name
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }

    }
}