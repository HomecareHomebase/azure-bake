import {BaseIngredient} from '@azbake/core'
import { IIngredient, IBakeRegion } from '@azbake/core'
import { DeploymentContext } from '@azbake/core'
import { IngredientManager } from '@azbake/core'

export {BaseIngredient}

export class IngredientFactory {

    public static Build(name: string, ingredient: IIngredient, ctx: DeploymentContext) : BaseIngredient | null {

        return IngredientManager.CreateIngredient(ingredient.properties.type, name, ingredient, ctx)
    }
}
