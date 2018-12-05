import {BaseIngredient} from './base-ingredient'
import {CustomArmIngredient} from './custom-arm'
import { IIngredient, IBakeRegion } from '../bake-loader'
import {BakeData} from '../bake-library'
import { Logger } from '../logger'

export {BaseIngredient}

export class IngredientFactory {

    public static Build(name: string, ingredient: IIngredient, region: IBakeRegion, logger: Logger) : BaseIngredient | null {

        switch(ingredient.properties.type){
            case "infrastucture": {
                return this.InfrastructureBuild(name, ingredient, region, logger)
            }
            default: {
                return new BaseIngredient(name, BakeData.Config, ingredient, BakeData.CLI, region, logger )
            }
        }

        return null
    }

    private static InfrastructureBuild(name: string, ingredient: IIngredient, region: IBakeRegion, logger: Logger): BaseIngredient {

        switch(ingredient.properties.template){
            default: {
                return new CustomArmIngredient(name, BakeData.Config, ingredient, BakeData.CLI, region, logger)
            }
        }
    }
}