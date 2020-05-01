// import { Validator } from 'fluentvalidation-ts';
// import * as Config from './configuration';
// import { BakeVariable } from '@azbake/core';


// export class UpdateTargetConfigurationValidator extends Validator<Config.IUpdateTargetConfiguration> {
//     constructor() {
//         super();

//         this.ruleFor('name')
//             .notNull()
//             .must(name => name.Value().length > 0)
//             .withMessage('Please enter your name');

//         //this.ruleForEach('selectors').
//     }
// }


// export class PropertyCreateConfiguration extends Validator<Config.IPropertyCreateConfiguration> {
//     constructor() {
//         super();

//         this.ruleFor('name')
//             .notNull()
//             .withMessage('Please enter your name');

//         this.ruleFor('value')
//             .notNull()
//             .withMessage('Please enter your name');

//         this.ruleFor('expirationDate')
//             .must(Validations.BeFutureDate)
//             .withMessage('The expiration date must be greater then or equal to now.')
//             .when(d => d.expirationDate != undefined);

//         this.ruleFor('activeDate')
//             .must((d, m) => Validations.BeLessThenExpiration(d, m.expirationDate))
//             .withMessage('The active date must be less then or equal the expiration date.')
//             .when(d => d.expirationDate != undefined && d.activeDate != undefined);
//     }
// }


// export class PropertyConfigurationValidator extends Validator<Config.IPropertyConfiguration> {
//     constructor() {
//         super();

//         this.ruleForEach('create').setValidator(new PropertyCreateConfiguration())

//         this.ruleFor('create').setValidator(() => new NameValidator());
//         this.ruleFor('create').setValidator(() => new NameValidator());
//         this.ruleFor('create').setValidator(() => new NameValidator());
//         this.ruleFor('create').setValidator(() => new NameValidator());


//     }
// }

// class Validations {

//     static DateIsPresent(value: Date | undefined | null): boolean {

//         return (value) ? true : false;
//     }

//     static BeFutureDate(value: Date | undefined | null): boolean {

//         if (!value) {
//             return false;
//         }

//         return new Date(value).getTime() >= new Date().getTime();
//     }

//     static BeLessThenExpiration(value: Date | undefined | null, expiration: Date | undefined | null): boolean {

//         if (!value) {
//             return true;
//         }

//         if (!expiration) {
//             return true;
//         }

//         return new Date(value).getTime() <= new Date(expiration).getTime();
//     }

// }