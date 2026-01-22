import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'
import 'colors'

import { Logger } from '@azbake/core'

import { ConfigurationProvider } from '../src/configuration/configurationProvider'
import { ConfigurationValueResolver } from '../src/configuration/configurationValueResolver'
import { PropertyServiceConfiguration } from '../src/configuration/propertyServiceConfiguration'
import { SearchOperator } from '../src/models/searchOperator'

function createLogger() {
    const logs: string[] = []
    const errors: string[] = []
    const logger = {
        log: (msg: string) => logs.push(msg),
        error: (msg: string) => errors.push(msg),
        debug: (msg: string) => logs.push(msg),
        _logLevel: 'info'
    } as unknown as Logger

    return { logger, logs, errors }
}

describe('ConfigurationProvider', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Initialize', () => {
        it('loads property configuration and logs counts', async () => {
            const { logger, logs } = createLogger()
            
            const mockResolver = {
                GetPropertyByType: sandbox.stub().callsFake((type: string) => {
                    if (type === 'properties') {
                        return Promise.resolve({
                            create: [{ name: 'prop1', value: 'val1' }],
                            update: [{ target: { name: 'prop2' }, value: 'newval' }],
                            delete: undefined
                        })
                    }
                    return Promise.resolve(null)
                }),
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver

            const provider = new ConfigurationProvider(logger, mockResolver)
            const config = await provider.Initialize()

            expect(config.PropertyCreateCount).to.equal(1)
            expect(config.PropertyUpdateCount).to.equal(1)
            expect(config.PropertyDeleteCount).to.equal(0)
            expect(logs.some(msg => msg.includes('Loaded Property Configuration'))).to.equal(true)
        })

        it('loads secret configuration and logs counts', async () => {
            const { logger, logs } = createLogger()
            
            const mockResolver = {
                GetPropertyByType: sandbox.stub().callsFake((type: string) => {
                    if (type === 'secrets') {
                        return Promise.resolve({
                                create: [{ name: 'secret1', value: 'secretval', selectors: { env: 'dev' } }],
                            update: undefined,
                                delete: undefined
                        })
                    }
                    return Promise.resolve(null)
                }),
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver

            const provider = new ConfigurationProvider(logger, mockResolver)
            const config = await provider.Initialize()

            expect(config.SecretCreateCount).to.equal(1)
                expect(config.SecretDeleteCount).to.equal(0)
            expect(logs.some(msg => msg.includes('Loaded Secret Configuration'))).to.equal(true)
        })

        it('resolves search operator strings to enum values in property delete', async () => {
            const { logger } = createLogger()
            
            const mockResolver = {
                GetPropertyByType: sandbox.stub().callsFake((type: string) => {
                    if (type === 'properties') {
                        return Promise.resolve({
                                create: [{ name: 'validprop', value: 'validval' }],
                            update: undefined,
                            delete: [
                                    { name: 'deleteprop1', operator: 'Equals', selectors: { env: 'dev' } },
                                    { name: 'deleteprop2', operator: 'Contains', selectors: { env: 'prod' } }
                            ]
                        })
                    }
                    return Promise.resolve(null)
                }),
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver

            const provider = new ConfigurationProvider(logger, mockResolver)
            const config = await provider.Initialize()

            expect(config.PropertyConfiguration!.delete![0].operator).to.equal(SearchOperator.Equals)
            expect(config.PropertyConfiguration!.delete![1].operator).to.equal(SearchOperator.Contains)
        })

        it('resolves search operator strings to enum values in secret delete', async () => {
            const { logger } = createLogger()
            
            const mockResolver = {
                GetPropertyByType: sandbox.stub().callsFake((type: string) => {
                    if (type === 'secrets') {
                        return Promise.resolve({
                            create: undefined,
                            update: undefined,
                            delete: [
                                { name: 'secret1', operator: 'None', allVersions: true }
                            ]
                        })
                    }
                    return Promise.resolve(null)
                }),
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver

            const provider = new ConfigurationProvider(logger, mockResolver)
            const config = await provider.Initialize()

            expect(config.SecretConfiguration!.delete![0].operator).to.equal(SearchOperator.None)
        })

        it('calls variable resolver to resolve bake variables', async () => {
            const { logger } = createLogger()
            
            const mockResolver = {
                GetPropertyByType: sandbox.stub().callsFake((type: string) => {
                    if (type === 'properties') {
                        return Promise.resolve({
                            create: [{ name: '[bake.variables.propName]', value: 'val' }]
                        })
                    }
                    return Promise.resolve(null)
                }),
                GetPropertyValue: sandbox.stub().resolves('resolved-name')
            } as unknown as ConfigurationValueResolver

            const provider = new ConfigurationProvider(logger, mockResolver)
            const config = await provider.Initialize()

            // The variable resolver should have processed the bake variable
            expect(config.PropertyConfiguration!.create![0].name).to.equal('resolved-name')
        })

        it('throws when configuration has no values', async () => {
            const { logger } = createLogger()
            
            const mockResolver = {
                GetPropertyByType: sandbox.stub().resolves(null),
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver

            const provider = new ConfigurationProvider(logger, mockResolver)

            let error: Error | null = null
            try {
                await provider.Initialize()
            } catch (err) {
                error = err as Error
            }

            expect(error).to.not.equal(null)
            expect(error?.message).to.equal('no property types have been specified.')
        })

        it('throws when validation fails', async () => {
            const { logger, errors } = createLogger()
            
            const mockResolver = {
                GetPropertyByType: sandbox.stub().callsFake((type: string) => {
                    if (type === 'properties') {
                        return Promise.resolve({
                            create: [{ name: '', value: '' }]  // Invalid: empty name and value
                        })
                    }
                    return Promise.resolve(null)
                }),
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver

            const provider = new ConfigurationProvider(logger, mockResolver)

            let error: Error | null = null
            try {
                await provider.Initialize()
            } catch (err) {
                error = err as Error
            }

            expect(error).to.not.equal(null)
            expect(error?.message).to.equal('One or more configuration errors.')
        })

        it('loads both properties and secrets configuration', async () => {
            const { logger, logs } = createLogger()
            
            const mockResolver = {
                GetPropertyByType: sandbox.stub().callsFake((type: string) => {
                    if (type === 'properties') {
                        return Promise.resolve({
                            create: [{ name: 'prop1', value: 'val1' }]
                        })
                    }
                    if (type === 'secrets') {
                        return Promise.resolve({
                            create: [{ name: 'secret1', value: 'secretval' }]
                        })
                    }
                    return Promise.resolve(null)
                }),
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver

            const provider = new ConfigurationProvider(logger, mockResolver)
            const config = await provider.Initialize()

            expect(config.PropertyCount).to.equal(1)
            expect(config.SecretCount).to.equal(1)
            expect(config.Count).to.equal(2)
            expect(logs.some(msg => msg.includes('Loaded [2] configuration types'))).to.equal(true)
        })

        it('logs begin and end loading configuration messages', async () => {
            const { logger, logs } = createLogger()
            
            const mockResolver = {
                GetPropertyByType: sandbox.stub().callsFake((type: string) => {
                    if (type === 'properties') {
                        return Promise.resolve({
                            create: [{ name: 'prop1', value: 'val1' }]
                        })
                    }
                    return Promise.resolve(null)
                }),
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver

            const provider = new ConfigurationProvider(logger, mockResolver)
            await provider.Initialize()

            expect(logs.some(msg => msg.includes('Begin loading configuration'))).to.equal(true)
            expect(logs.some(msg => msg.includes('End loading configuration'))).to.equal(true)
        })

        it('handles null property configuration delete array', async () => {
            const { logger } = createLogger()
            
            const mockResolver = {
                GetPropertyByType: sandbox.stub().callsFake((type: string) => {
                    if (type === 'properties') {
                        return Promise.resolve({
                            create: [{ name: 'prop1', value: 'val1' }],
                            delete: null  // explicitly null
                        })
                    }
                    return Promise.resolve(null)
                }),
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver

            const provider = new ConfigurationProvider(logger, mockResolver)
            const config = await provider.Initialize()

            expect(config.PropertyDeleteCount).to.equal(0)
        })

        it('handles null secret configuration delete array', async () => {
            const { logger } = createLogger()
            
            const mockResolver = {
                GetPropertyByType: sandbox.stub().callsFake((type: string) => {
                    if (type === 'secrets') {
                        return Promise.resolve({
                            create: [{ name: 'secret1', value: 'secretval' }],
                            delete: null  // explicitly null
                        })
                    }
                    return Promise.resolve(null)
                }),
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver

            const provider = new ConfigurationProvider(logger, mockResolver)
            const config = await provider.Initialize()

            expect(config.SecretDeleteCount).to.equal(0)
        })
    })
})
