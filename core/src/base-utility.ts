import { DeploymentContext } from "./deployment-context";

export class BaseUtility {
    constructor(ctx: DeploymentContext) {
        this.context = ctx
    }
    context : DeploymentContext
}