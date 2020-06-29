import { BaseIngredient, IngredientManager } from "@azbake/core"

export class NullPlugin extends BaseIngredient {

    public async Execute(): Promise<void> {

        const params = this._ingredient.properties.parameters
        for (const [n,v] of params){
            await v.valueAsync(this._ctx)
        }
    }
}