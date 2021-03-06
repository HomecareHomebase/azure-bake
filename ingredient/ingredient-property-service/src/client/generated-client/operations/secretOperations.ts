/*
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is
 * regenerated.
 */

import * as msRest from "@azure/ms-rest-js";
import * as Models from "../models";
import * as Mappers from "../models/secretOperationsMappers";
import * as Parameters from "../models/parameters";
import { HCHBServicesPropertyServiceAPIv1Context } from "../hCHBServicesPropertyServiceAPIv1Context";

/** Class representing a SecretOperations. */
export class SecretOperations {
  private readonly client: HCHBServicesPropertyServiceAPIv1Context;

  /**
   * Create a SecretOperations.
   * @param {HCHBServicesPropertyServiceAPIv1Context} client Reference to the service client.
   */
  constructor(client: HCHBServicesPropertyServiceAPIv1Context) {
    this.client = client;
  }

  /**
   * @param property
   * @param [options] The optional parameters
   * @returns Promise<Models.SecretOperationsUpdateResponse>
   */
  update(property: Models.Secret, options?: msRest.RequestOptionsBase): Promise<Models.SecretOperationsUpdateResponse>;
  /**
   * @param property
   * @param callback The callback
   */
  update(property: Models.Secret, callback: msRest.ServiceCallback<any>): void;
  /**
   * @param property
   * @param options The optional parameters
   * @param callback The callback
   */
  update(property: Models.Secret, options: msRest.RequestOptionsBase, callback: msRest.ServiceCallback<any>): void;
  update(property: Models.Secret, options?: msRest.RequestOptionsBase | msRest.ServiceCallback<any>, callback?: msRest.ServiceCallback<any>): Promise<Models.SecretOperationsUpdateResponse> {
    return this.client.sendOperationRequest(
      {
        property,
        options
      },
      updateOperationSpec,
      callback) as Promise<Models.SecretOperationsUpdateResponse>;
  }

  /**
   * @param property
   * @param [options] The optional parameters
   * @returns Promise<Models.SecretOperationsCreateResponse>
   */
  create(property: Models.Secret, options?: msRest.RequestOptionsBase): Promise<Models.SecretOperationsCreateResponse>;
  /**
   * @param property
   * @param callback The callback
   */
  create(property: Models.Secret, callback: msRest.ServiceCallback<any>): void;
  /**
   * @param property
   * @param options The optional parameters
   * @param callback The callback
   */
  create(property: Models.Secret, options: msRest.RequestOptionsBase, callback: msRest.ServiceCallback<any>): void;
  create(property: Models.Secret, options?: msRest.RequestOptionsBase | msRest.ServiceCallback<any>, callback?: msRest.ServiceCallback<any>): Promise<Models.SecretOperationsCreateResponse> {
    return this.client.sendOperationRequest(
      {
        property,
        options
      },
      createOperationSpec,
      callback) as Promise<Models.SecretOperationsCreateResponse>;
  }

  /**
   * @param version
   * @param id
   * @param name
   * @param [options] The optional parameters
   * @returns Promise<Models.SecretOperationsReadResponse>
   */
  read(version: string, id: string, name: string, options?: msRest.RequestOptionsBase): Promise<Models.SecretOperationsReadResponse>;
  /**
   * @param version
   * @param id
   * @param name
   * @param callback The callback
   */
  read(version: string, id: string, name: string, callback: msRest.ServiceCallback<any>): void;
  /**
   * @param version
   * @param id
   * @param name
   * @param options The optional parameters
   * @param callback The callback
   */
  read(version: string, id: string, name: string, options: msRest.RequestOptionsBase, callback: msRest.ServiceCallback<any>): void;
  read(version: string, id: string, name: string, options?: msRest.RequestOptionsBase | msRest.ServiceCallback<any>, callback?: msRest.ServiceCallback<any>): Promise<Models.SecretOperationsReadResponse> {
    return this.client.sendOperationRequest(
      {
        version,
        id,
        name,
        options
      },
      readOperationSpec,
      callback) as Promise<Models.SecretOperationsReadResponse>;
  }

  /**
   * @param version
   * @param id
   * @param name
   * @param [options] The optional parameters
   * @returns Promise<Models.SecretOperationsDeleteMethodResponse>
   */
  deleteMethod(version: string, id: string, name: string, options?: msRest.RequestOptionsBase): Promise<Models.SecretOperationsDeleteMethodResponse>;
  /**
   * @param version
   * @param id
   * @param name
   * @param callback The callback
   */
  deleteMethod(version: string, id: string, name: string, callback: msRest.ServiceCallback<Models.ValidationResult>): void;
  /**
   * @param version
   * @param id
   * @param name
   * @param options The optional parameters
   * @param callback The callback
   */
  deleteMethod(version: string, id: string, name: string, options: msRest.RequestOptionsBase, callback: msRest.ServiceCallback<Models.ValidationResult>): void;
  deleteMethod(version: string, id: string, name: string, options?: msRest.RequestOptionsBase | msRest.ServiceCallback<Models.ValidationResult>, callback?: msRest.ServiceCallback<Models.ValidationResult>): Promise<Models.SecretOperationsDeleteMethodResponse> {
    return this.client.sendOperationRequest(
      {
        version,
        id,
        name,
        options
      },
      deleteMethodOperationSpec,
      callback) as Promise<Models.SecretOperationsDeleteMethodResponse>;
  }

  /**
   * @param name
   * @param selectorFilterType
   * @param [options] The optional parameters
   * @returns Promise<Models.SecretOperationsSearchResponse>
   */
  search(name: string, selectorFilterType: number, options?: Models.SecretOperationsSearchOptionalParams): Promise<Models.SecretOperationsSearchResponse>;
  /**
   * @param name
   * @param selectorFilterType
   * @param callback The callback
   */
  search(name: string, selectorFilterType: number, callback: msRest.ServiceCallback<any>): void;
  /**
   * @param name
   * @param selectorFilterType
   * @param options The optional parameters
   * @param callback The callback
   */
  search(name: string, selectorFilterType: number, options: Models.SecretOperationsSearchOptionalParams, callback: msRest.ServiceCallback<any>): void;
  search(name: string, selectorFilterType: number, options?: Models.SecretOperationsSearchOptionalParams | msRest.ServiceCallback<any>, callback?: msRest.ServiceCallback<any>): Promise<Models.SecretOperationsSearchResponse> {
    return this.client.sendOperationRequest(
      {
        name,
        selectorFilterType,
        options
      },
      searchOperationSpec,
      callback) as Promise<Models.SecretOperationsSearchResponse>;
  }
}

// Operation Specifications
const serializer = new msRest.Serializer(Mappers);
const updateOperationSpec: msRest.OperationSpec = {
  httpMethod: "PUT",
  path: "api/v1/Secrets",
  requestBody: {
    parameterPath: "property",
    mapper: {
      ...Mappers.Secret,
      required: true
    }
  },
  responses: {
    200: {
      bodyMapper: Mappers.Secret
    },
    400: {
      bodyMapper: Mappers.ValidationResult
    },
    401: {},
    404: {},
    409: {
      bodyMapper: Mappers.ValidationResult
    },
    default: {}
  },
  serializer
};

const createOperationSpec: msRest.OperationSpec = {
  httpMethod: "POST",
  path: "api/v1/Secrets",
  requestBody: {
    parameterPath: "property",
    mapper: {
      ...Mappers.Secret,
      required: true
    }
  },
  responses: {
    200: {
      bodyMapper: Mappers.Secret
    },
    400: {
      bodyMapper: Mappers.ValidationResult
    },
    401: {},
    409: {
      bodyMapper: Mappers.ValidationResult
    },
    default: {}
  },
  serializer
};

const readOperationSpec: msRest.OperationSpec = {
  httpMethod: "GET",
  path: "api/v1/Secrets/{Name}/{Id}/{Version}",
  urlParameters: [
    Parameters.version,
    Parameters.id,
    Parameters.name
  ],
  contentType: "application/json; charset=utf-8",
  responses: {
    200: {
      bodyMapper: Mappers.Secret
    },
    400: {
      bodyMapper: Mappers.ValidationResult
    },
    401: {},
    404: {},
    default: {}
  },
  serializer
};

const deleteMethodOperationSpec: msRest.OperationSpec = {
  httpMethod: "DELETE",
  path: "api/v1/Secrets/{Name}/{Id}/{Version}",
  urlParameters: [
    Parameters.version,
    Parameters.id,
    Parameters.name
  ],
  contentType: "application/json; charset=utf-8",
  responses: {
    200: {},
    400: {
      bodyMapper: Mappers.ValidationResult
    },
    401: {},
    404: {},
    default: {}
  },
  serializer
};

const searchOperationSpec: msRest.OperationSpec = {
  httpMethod: "GET",
  path: "api/v1/Secrets/Search",
  queryParameters: [
    Parameters.name,
    Parameters.selectorFilterType,
    Parameters.selectors
  ],
  contentType: "application/json; charset=utf-8",
  responses: {
    200: {
      bodyMapper: {
        serializedName: "parsedResponse",
        type: {
          name: "Sequence",
          element: {
            type: {
              name: "Composite",
              className: "Secret"
            }
          }
        }
      }
    },
    400: {
      bodyMapper: Mappers.ValidationResult
    },
    401: {},
    404: {},
    default: {}
  },
  serializer
};
