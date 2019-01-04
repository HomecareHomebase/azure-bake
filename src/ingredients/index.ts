import {BaseIngredient} from './base-ingredient'
import {CustomArmIngredient} from './custom-arm'
import { IIngredient, IBakeRegion } from '../bake-loader'
import { DeploymentContext } from '../deployment-context';

export {BaseIngredient}

export class IngredientFactory {

    public static Build(name: string, ingredient: IIngredient, ctx: DeploymentContext) : BaseIngredient | null {

        switch(ingredient.properties.type){
            case "infrastucture": {
                return this.InfrastructureBuild(name, ingredient, ctx)
            }
            default: {
                return new BaseIngredient(name, ingredient, ctx )
            }
        }
    }

    private static InfrastructureBuild(name: string, ingredient: IIngredient, ctx: DeploymentContext): BaseIngredient {

        switch(ingredient.properties.template){
            default: {
                return new CustomArmIngredient(name, ingredient, ctx)
            }
        }
    }
}