import { DeploymentContext, BakeVariable, objToVariableMap } from "@azbake/core"

interface PropertySourceContext {
    baseUrl: BakeVariable;
    resourceUrl: BakeVariable;
};

export class PropertyServiceSource {

    private readonly _baseUrl: string;
    private readonly _resouceUrl: string;

    private constructor(baseUrl: string, resouceUrl: string) {
        this._baseUrl = baseUrl;
        this._resouceUrl = resouceUrl;
    }

    get baseUrl(): string {
        return this._baseUrl;
    }
    get resourceUrl(): string {
        return this._resouceUrl;
    }

    public static async Parse(context: DeploymentContext): Promise<PropertyServiceSource> {

        const sourceContext: PropertySourceContext = await context.Ingredient.properties.source.valueAsync(context);
        if (!sourceContext) {
            return Promise.reject('The ingredients properties.source is null, or missing. Please verify that the properties.source is set to the property services baseUrl and resourceUrl in your yaml file.');
        }
        const sourceMap: Map<string,BakeVariable> = objToVariableMap(sourceContext);

        const baseUrl: string | undefined = await sourceMap.get('baseUrl')?.valueAsync(context);
        if (!baseUrl || baseUrl.length == 0) {
            return Promise.reject('The ingredients properties.source does not contain a baseUrl element. Please verify that the properties.source is set to the property services baseUrl and resourceUrl in your yaml file.');
        }

        context._logger.log('The baseurl was parased successfully.')

        const resourceUrl: string | undefined = await sourceMap.get('resourceUrl')?.valueAsync(context);
        if (!resourceUrl || resourceUrl.length == 0) {
            return Promise.reject('The ingredients properties.source does not contain a resourceUrl element. Please verify that the properties.source is set to the property services baseUrl and resourceUrl in your yaml file.');
        }

        context._logger.log('The resourceUrl was parased successfully.')

        return new PropertyServiceSource(baseUrl, resourceUrl);
    }
}