import { BaseIngredient } from "./base-ingredient";
import { IIngredient, IBakeConfig, IBakeRegion } from "../bake-loader";
import * as fs from 'fs'
import cli, { AzError } from "azcli-npm";
import { Logger } from "../logger";

export class CustomArmIngredient extends BaseIngredient {
    constructor(name: string, bake: IBakeConfig, ingredient: IIngredient, azcli: cli, region: IBakeRegion, logger: Logger) {
        super(name, bake, ingredient, azcli, region, logger)        
    }

    public async Execute(): Promise<string> {

        let chk = fs.existsSync(this._ingredient.properties.template)
        if (!chk) {
            this._logger.error('could not locate arm template: ' + this._ingredient.properties.template)
            return this._name
        }

        let cli = this._cli.start()

        try {
            this._logger.log('starting custom arm deployment for template: ' + this._ingredient.properties.template)
            let json = await cli.arg('group').arg('deployment').arg('create')
            .arg('-g=' + this._config.rgOverride.value)
            .arg('-n=' + this._name)
            .arg('--template-file=' + this._ingredient.properties.template)
            .execJsonAsync()

            this._logger.log('deployment finished')
            return this._name
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }

    }
}