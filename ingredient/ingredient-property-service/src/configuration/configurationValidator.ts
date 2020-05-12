import { Logger } from "@azbake/core";

import { Validator } from "fluentvalidation-ts";

import { PropertyConfigurationValidator } from '../validations/propertyValidations'
import { SecretConfigurationValidator } from "../validations/secretValidations";
import { PropertyServiceConfiguration } from "./propertyServiceConfiguration";
import { IOperationConfiguration } from ".";
import { PropertyType } from "../propertyTypes";
import { StringUtils } from "../utils/stringUtil";

export class ConfigurationValidator {

    private readonly _logger: Logger;

    constructor(logger: Logger) {
        this._logger = logger;
    }

    public async ValidateConfiguration(configuration: PropertyServiceConfiguration): Promise<void> {

        this._logger.log('Begin validating configuration'.cyan);

        if (!configuration.HasValues) {
            throw new Error('no property types have been specified.');
        }

        let hasPropertyErrors: boolean = false;
        let hasSecretErrors: boolean = false;

        if (configuration.PropertyConfiguration) {
            hasPropertyErrors = this._executeValidator(PropertyType.Property, configuration.PropertyConfiguration, PropertyConfigurationValidator);
        }
        if (configuration.SecretConfiguration) {
            hasSecretErrors = this._executeValidator(PropertyType.Secret, configuration.SecretConfiguration, SecretConfigurationValidator);
        }

        if (hasPropertyErrors || hasSecretErrors) {
            this._logger.error('Configuration validation failed');
            throw new Error('One or more configuration errors.')
        }

        this._logger.log('Configuration validation was successful');

        this._logger.log('End validating configuration'.cyan);
    }

    private _executeValidator<TConfiguration extends IOperationConfiguration<any, any, any>,
        TValidator extends Validator<TConfiguration>>(type: string, configuration: TConfiguration, validator: new () => TValidator): boolean {

        const validatorObject = new validator();
        const errors = validatorObject.validate(configuration)

        if (!errors || Object.keys(errors).length == 0) {
            return false;
        }

        if (errors.create) {
            this._logger.error(`${StringUtils.ToTitleCase(type)} create configuration: Errors: ${JSON.stringify(errors.create)}`)
        }
        if (errors.update) {
            this._logger.error(`${StringUtils.ToTitleCase(type)} update configuration: Errors: ${JSON.stringify(errors.update)}`)
        }
        if (errors.delete) {
            this._logger.error(`${StringUtils.ToTitleCase(type)} delete configuration: Errors: ${JSON.stringify(errors.delete)}`)
        }

        return true;
    }
}