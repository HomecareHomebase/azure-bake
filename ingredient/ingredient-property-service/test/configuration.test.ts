import { expect } from 'chai'
import 'mocha'

import { Logger } from '@azbake/core'
import { PropertyServiceConfiguration } from '../src/configuration/propertyServiceConfiguration'
import { ConfigurationValidator } from '../src/configuration/configurationValidator'
import { SearchOperator } from '../src/models/searchOperator'


describe('property-service configuration', () => {
    it('calculates counts and flags', () => {
        const config = new PropertyServiceConfiguration()

        expect(config.Count).to.equal(0)
        expect(config.HasValues).to.equal(false)

        config.PropertyConfiguration = {
            create: [{ name: 'prop', value: 'value' }],
            update: [{ target: { name: 'prop' }, name: 'prop2' }],
            delete: [{ name: 'prop', operator: SearchOperator.Equals }]
        }

        config.SecretConfiguration = {
            create: [{ name: 'secret', value: 'value' }],
            delete: [{ name: 'secret', operator: SearchOperator.None, allVersions: false }]
        }

        expect(config.PropertyCreateCount).to.equal(1)
        expect(config.PropertyUpdateCount).to.equal(1)
        expect(config.PropertyDeleteCount).to.equal(1)
        expect(config.PropertyCount).to.equal(3)

        expect(config.SecretCreateCount).to.equal(1)
        expect(config.SecretUpdateCount).to.equal(0)
        expect(config.SecretDeleteCount).to.equal(1)
        expect(config.SecretCount).to.equal(2)

        expect(config.Count).to.equal(5)
        expect(config.HasValues).to.equal(true)
    })

    it('fails validation when no configuration is provided', async () => {
        const logger = new Logger()
        const validator = new ConfigurationValidator(logger)
        const config = new PropertyServiceConfiguration()

        let error: Error | undefined
        try {
            await validator.ValidateConfiguration(config)
        } catch (err) {
            error = err as Error
        }

        expect(error).to.not.equal(undefined)
        expect(error?.message).to.equal('no property types have been specified.')
    })

    it('fails validation when entries are invalid', async () => {
        const logger = new Logger()
        const validator = new ConfigurationValidator(logger)
        const config = new PropertyServiceConfiguration()
        config.PropertyConfiguration = {
            create: [{ name: '', value: '' }]
        }

        let error: Error | undefined
        try {
            await validator.ValidateConfiguration(config)
        } catch (err) {
            error = err as Error
        }

        expect(error).to.not.equal(undefined)
        expect(error?.message).to.equal('One or more configuration errors.')
    })

    it('passes validation with valid entries', async () => {
        const logger = new Logger()
        const validator = new ConfigurationValidator(logger)
        const config = new PropertyServiceConfiguration()
        config.PropertyConfiguration = {
            create: [{ name: 'prop', value: 'value' }]
        }

        await validator.ValidateConfiguration(config)
    })
})