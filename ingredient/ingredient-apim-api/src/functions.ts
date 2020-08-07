import { BaseUtility } from '@azbake/core'
import { ApiManagementClient } from "@azure/arm-apimanagement"
import { ApiGetResponse, BackendGetResponse } from '@azure/arm-apimanagement/esm/models';

export class ApimApiUtils extends BaseUtility {

    public async get_api(resourceGroup: string, apimName: string, apiId: string): Promise<ApiGetResponse> {
        let client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let api = await client.api.get(resourceGroup, apimName, apiId);
        
        this.context._logger.debug(`ApimApiUtils.get_api() returned ${JSON.stringify(api)}`);

        return api;
    }

    public async get_backend(resourceGroup: string, apimName: string, backendId: string): Promise<BackendGetResponse> {
        let client = new ApiManagementClient(this.context.AuthToken, this.context.Environment.authentication.subscriptionId);
        let backend = await client.backend.get(resourceGroup, apimName, backendId);
        
        this.context._logger.debug(`ApimApiUtils.get_backend() returned ${JSON.stringify(backend)}`);

        return backend;
    }

    public get_hostheader(namespace: string, k8sHostname: string, serviceName: string | null = null): string {
        var hostHeader = `${serviceName || this.context.Config.shortName}-${namespace}.${k8sHostname}`;

        this.context._logger.debug(`ApimApiUtils.get_hostheader() returned ${hostHeader}`);

        return hostHeader;
    }

    public get_swaggerUrl(namespace: string, k8sHostname: string, version: string, serviceName: string | null = null, protocol: string | null = 'http'): string {
        var swaggerUrl = `${protocol}://${this.get_hostheader(namespace, k8sHostname, serviceName)}/swagger/${version}/swagger.json`;

        this.context._logger.debug(`ApimApiUtils.get_swaggerUrl() returned ${swaggerUrl}`);

        return swaggerUrl;
    }
}