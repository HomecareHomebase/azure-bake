import { Validator } from 'fluentvalidation-ts';

import { IPropertyConfiguration, IPropertyCreateConfiguration, IPropertyUpdateConfiguration, IPropertyDeleteConfiguration } from '../configuration/models/property';
import { CreateConfiguratrionBaseValidator, UpdateConfigurationBaseValidator, DeleteConfigurationBaseValidator } from './baseValidators';

export class PropertyCreateConfiguration extends CreateConfiguratrionBaseValidator<IPropertyCreateConfiguration> {
    constructor() {
        super();

        this.ruleFor('value')
            .notNull()
            .notEmpty();
    }
}

export class PropertyUpdateConfiguration extends UpdateConfigurationBaseValidator<IPropertyUpdateConfiguration> {
    constructor() {
        super();
    }
}

export class PropertyDeleteConfiguration extends DeleteConfigurationBaseValidator<IPropertyDeleteConfiguration> {
    constructor() {
        super();
    }
}

export class PropertyConfigurationValidator extends Validator<IPropertyConfiguration> {
    constructor() {
        super();

        this.ruleForEach('create').setValidator(() => new PropertyCreateConfiguration())
        this.ruleForEach('update').setValidator(() => new PropertyUpdateConfiguration());
        this.ruleForEach('delete').setValidator(() => new PropertyDeleteConfiguration());
    }
}