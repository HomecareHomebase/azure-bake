import { Validator } from 'fluentvalidation-ts';

import { Validations } from './validation';
import { IUpdateTargetConfiguration, ICreateConfiguration, IUpdateConfiguration, IDeleteConfiguration } from '../configuration/models/baseConfigurations';
import { SearchOperator } from '../models';

export class UpdateTargetConfigurationValidator extends Validator<IUpdateTargetConfiguration> {
    constructor() {
        super();

        this.ruleFor('name')
            .notNull()
            .notEmpty();
    }
}

export abstract class CreateConfiguratrionBaseValidator<TConfiguration extends ICreateConfiguration> extends Validator<TConfiguration> {
    constructor() {
        super();

        this.ruleFor('name')
            .notNull()
            .notEmpty();

        this.ruleFor('expirationDate')
            .must(Validations.BeFutureDate)
            .withMessage('The expiration date must be greater then or equal to now.')
            .when(model => model.expirationDate != undefined && model.expirationDate != null);

        this.ruleFor('activeDate')
            .must((date, model) => Validations.BeLessThenExpiration(date, model.expirationDate))
            .withMessage('The active date must be less then or equal the expiration date.')
            .when(model => model.expirationDate != undefined && model.expirationDate != null && model.activeDate != undefined && model.activeDate != null);
    }
}

export abstract class UpdateConfigurationBaseValidator<TConfiguration extends IUpdateConfiguration> extends Validator<TConfiguration> {
    constructor() {
        super();

        this.ruleFor('activeDate')
            .must((date, model) => Validations.BeLessThenExpiration(date, model.expirationDate))
            .withMessage('The active date must be less then or equal the expiration date.')
            .when(model => model.expirationDate != undefined && model.expirationDate != null && model.activeDate != undefined && model.activeDate != null);

        this.ruleFor('target').notNull().setValidator(() => new UpdateTargetConfigurationValidator());

        this.ruleFor('target')
            .must(Validations.TargetHasOneOrMoreValues)
            .withMessage('No property values have been specified to update.')
            .when((model) => model.target != null && model.target != undefined);
    }
}


export abstract class DeleteConfigurationBaseValidator<TConfiguration extends IDeleteConfiguration> extends Validator<TConfiguration> {
    constructor() {
        super();

        this.ruleFor('name')
            .notNull()
            .notEmpty();

        this.ruleFor('operator')
            .must(Validations.BeSearchOperator)
            .withMessage('The operator must be equal to None, Equals, or Contains.');

        this.ruleFor('selectors')
            .must((selectors) => selectors == null || selectors == undefined)
            .withMessage('The selectors must be null or undefined when the operator is None.')
            .when(model => model.operator == SearchOperator.None)

        this.ruleFor('selectors')
            .must((selectors) => selectors != null || selectors != undefined)
            .withMessage('The selectors must contain one or more key value pairs when the operator is Equals or Contains.')
            .when(model => model.operator == SearchOperator.Equals || model.operator == SearchOperator.Contains)
    }
}