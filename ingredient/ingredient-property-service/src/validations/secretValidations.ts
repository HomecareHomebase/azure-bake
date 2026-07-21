import { Validator } from 'fluentvalidation-ts';

import { ISecretConfiguration, ISecretCreateConfiguration, ISecretUpdateConfiguration, ISecretDeleteConfiguration } from '../configuration/models/secret';
import { CreateConfiguratrionBaseValidator, UpdateConfigurationBaseValidator, DeleteConfigurationBaseValidator } from './baseValidators';

export class SecretCreateConfiguration extends CreateConfiguratrionBaseValidator<ISecretCreateConfiguration> {
    constructor() {
        super();

        this.ruleFor('value')
            .notNull()
            .notEmpty();

        // connectionStringFrom is seed-once by nature and is only supported under 'seed'.
        this.ruleFor('connectionStringFrom')
            .must(source => source == null || source == undefined)
            .withMessage("connectionStringFrom is only supported under 'seed'.");
    }
}

export class SecretSeedConfiguration extends CreateConfiguratrionBaseValidator<ISecretCreateConfiguration> {
    constructor() {
        super();

        this.ruleFor('value')
            .notNull()
            .notEmpty()
            .when(model => !model.connectionStringFrom);
    }

    // When a connection string source is supplied the name is derived and the value is
    // pulled at deploy time, so neither is required in the recipe.
    protected nameRequired(model: ISecretCreateConfiguration): boolean {
        return !model.connectionStringFrom;
    }
}

export class SecretUpdateConfiguration extends UpdateConfigurationBaseValidator<ISecretUpdateConfiguration> {
    constructor() {
        super();
    }
}

export class SecretDeleteConfiguration extends DeleteConfigurationBaseValidator<ISecretDeleteConfiguration> {
    constructor() {
        super();
    }
}

export class SecretConfigurationValidator extends Validator<ISecretConfiguration> {
    constructor() {
        super();

        this.ruleForEach('seed').setValidator(() => new SecretSeedConfiguration())
        this.ruleForEach('create').setValidator(() => new SecretCreateConfiguration())
        this.ruleForEach('update').setValidator(() => new SecretUpdateConfiguration());
        this.ruleForEach('delete').setValidator(() => new SecretDeleteConfiguration());
    }
}