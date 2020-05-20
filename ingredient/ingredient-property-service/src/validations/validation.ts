import { SearchOperator } from "../models";
import { IUpdateTargetConfiguration } from "../configuration";

export class Validations {

    static TargetHasOneOrMoreValues(target: IUpdateTargetConfiguration, value: any): boolean {
        return Object.keys(value).some((key) => {
            if (key == 'target') {
                return false;
            }

            if (value[key]) {
                return true;
            }
            return false;
        });

    }

    static DateIsPresent(value: Date | undefined | null): boolean {

        return (value) ? true : false;
    }

    static BeFutureDate(value: Date | undefined | null): boolean {

        if (!value) {
            return false;
        }

        return new Date(value).getTime() >= new Date().getTime();
    }

    static BeSearchOperator(value: SearchOperator): boolean {

        if (value == null || value == undefined) {
            return false;
        }

        if (value == SearchOperator.Equals) {
            return true;
        }

        if (value == SearchOperator.Contains) {
            return true;
        }

        if (value == SearchOperator.None) {
            return true;
        }

        return false;
    }

    static BeLessThenExpiration(value: Date | undefined | null, expiration: Date | undefined | null): boolean {

        if (!value) {
            return true;
        }

        if (!expiration) {
            return true;
        }

        return new Date(value).getTime() <= new Date(expiration).getTime();
    }

}