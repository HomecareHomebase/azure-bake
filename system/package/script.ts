import {DeploymentContext, Logger, IngredientManager} from '@azbake/core'

function onExecute(ctx: DeploymentContext, logger: Logger, params: any){

    let utils = IngredientManager.GetIngredientFunctionWrapper('coreutils', ctx)
    logger.log(utils.current_region().name)
}