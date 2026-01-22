import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'
import 'colors'

import { Logger, BakeVariable } from '@azbake/core'

import { VariableResolver } from '../src/configuration/variableResolver'
import { ConfigurationValueResolver } from '../src/configuration/configurationValueResolver'
import { PropertyServiceConfiguration } from '../src/configuration/propertyServiceConfiguration'
import { SearchOperator } from '../src/models/searchOperator'

function createLogger(logLevel: string = 'info') {
    const logs: string[] = []
    const errors: string[] = []
    const logger = {
        log: (msg: string) => logs.push(msg),
        error: (msg: string) => errors.push(msg),
        debug: (msg: string) => logs.push(msg),
        _logLevel: logLevel
    } as unknown as Logger

    return { logger, logs, errors }
}

describe('VariableResolver', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('ResolveBakeVariables', () => {
        it('returns early when configuration has no values', async () => {
            const { logger, logs } = createLogger()
            const mockResolver = {} as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()

            await variableResolver.ResolveBakeVariables(config)

            // Should not log 'Begin resolving bake variables' as it returns early
            expect(logs.some(msg => msg.includes('Begin resolving bake variables'))).to.equal(false)
        })

        it('resolves bake variables in property create configuration', async () => {
            const { logger, logs } = createLogger()
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('resolved-value')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.PropertyConfiguration = {
                create: [{ name: 'prop1', value: '[bake.variables.testVar]' }],
                update: undefined,
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            expect(logs.some(msg => msg.includes('Begin resolving bake variables'))).to.equal(true)
            expect(logs.some(msg => msg.includes('Resolving bake variables was successful'))).to.equal(true)
            expect(config.PropertyConfiguration!.create![0].value).to.equal('resolved-value')
        })

        it('resolves bake variables in property update configuration', async () => {
            const { logger } = createLogger()
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('updated-name')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.PropertyConfiguration = {
                create: undefined,
                update: [{ target: { name: 'original' }, name: '[bake.variables.newName]' }],
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            expect(config.PropertyConfiguration!.update![0].name).to.equal('updated-name')
        })

        it('resolves bake variables in property delete configuration', async () => {
            const { logger } = createLogger()
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('delete-pattern')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.PropertyConfiguration = {
                create: undefined,
                update: undefined,
                delete: [{ name: '[bake.variables.pattern]', operator: SearchOperator.Contains }]
            }

            await variableResolver.ResolveBakeVariables(config)

            expect(config.PropertyConfiguration!.delete![0].name).to.equal('delete-pattern')
        })

        it('resolves bake variables in secret create configuration', async () => {
            const { logger } = createLogger()
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('secret-value')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.SecretConfiguration = {
                create: [{ name: 'secret1', value: '[bake.variables.secretVal]' }],
                update: undefined,
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            expect(config.SecretConfiguration!.create![0].value).to.equal('secret-value')
        })

        it('resolves bake variables in secret update configuration', async () => {
            const { logger } = createLogger()
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('new-secret')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.SecretConfiguration = {
                create: undefined,
                update: [{ target: { name: 'old-secret' }, value: '[bake.variables.newSecret]' } as any],
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            expect(config.SecretConfiguration!.update![0].value).to.equal('new-secret')
        })

        it('resolves bake variables in secret delete configuration', async () => {
            const { logger } = createLogger()
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('secret-delete-pattern')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.SecretConfiguration = {
                create: undefined,
                update: undefined,
                delete: [{ name: '[bake.variables.secretPattern]', operator: SearchOperator.Equals, allVersions: true }]
            }

            await variableResolver.ResolveBakeVariables(config)

            expect(config.SecretConfiguration!.delete![0].name).to.equal('secret-delete-pattern')
        })

        it('skips non-string property values', async () => {
            const { logger } = createLogger()
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.PropertyConfiguration = {
                create: [{ 
                    name: 'prop1', 
                    value: 'static-value',
                    expirationDate: new Date('2025-01-01'),  // non-string
                    selectors: { env: 'dev' }  // non-string object
                }],
                update: undefined,
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            // The resolver should not have been called for non-string or non-bake-variable values
            // name and value are strings but only value could be a bake variable
            expect((mockResolver.GetPropertyValue as sinon.SinonStub).called).to.equal(false)
        })

        it('skips strings that do not start with [ or end with ]', async () => {
            const { logger } = createLogger()
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.PropertyConfiguration = {
                create: [{ name: 'prop1', value: 'plain-value' }],
                update: undefined,
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            expect((mockResolver.GetPropertyValue as sinon.SinonStub).called).to.equal(false)
        })

        it('handles empty configuration arrays gracefully', async () => {
            const { logger } = createLogger()
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.PropertyConfiguration = {
                create: [],
                update: [],
                delete: []
            }

            await variableResolver.ResolveBakeVariables(config)

            expect((mockResolver.GetPropertyValue as sinon.SinonStub).called).to.equal(false)
        })

        it('handles undefined configuration arrays gracefully', async () => {
            const { logger } = createLogger()
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('resolved')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.PropertyConfiguration = {
                create: undefined,
                update: undefined,
                delete: undefined
            }
            // HasValues will be false, should return early
            // But let's add a secret to trigger property resolution
            config.SecretConfiguration = {
                create: [{ name: 'secret', value: '[bake.variables.val]' }],
                update: undefined,
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            // Should have processed the secret
            expect((mockResolver.GetPropertyValue as sinon.SinonStub).calledOnce).to.equal(true)
        })

        it('resolves object values from bake variables', async () => {
            const { logger, logs } = createLogger('debug')
            const resolvedObject = { nested: 'value', count: 5 }
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves(resolvedObject)
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.PropertyConfiguration = {
                create: [{ name: 'prop1', value: '[bake.variables.objectVar]' }],
                update: undefined,
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            expect(config.PropertyConfiguration!.create![0].value).to.deep.equal(resolvedObject)
            expect(logs.some(msg => msg.includes(JSON.stringify(resolvedObject)))).to.equal(true)
        })

        it('masks secret values in debug logs', async () => {
            const { logger, logs } = createLogger('debug')
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('super-secret-password')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.SecretConfiguration = {
                create: [{ name: 'mysecret', value: '[bake.variables.password]' }],
                update: undefined,
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            expect(logs.some(msg => msg.includes('secret value masked'))).to.equal(true)
            expect(logs.some(msg => msg.includes('super-secret-password'))).to.equal(false)
        })

        it('logs debug message with value when not in debug mode for non-secrets', async () => {
            const { logger, logs } = createLogger('info')
            const mockResolver = {
                GetPropertyValue: sandbox.stub().resolves('simple-value')
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.PropertyConfiguration = {
                create: [{ name: 'prop', value: '[bake.variables.val]' }],
                update: undefined,
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            // In non-debug mode, just logs the variable name being resolved
            expect(logs.some(msg => msg.includes('properties.create[0].value'))).to.equal(true)
        })

        it('resolves multiple bake variables in single configuration item', async () => {
            const { logger } = createLogger()
            let callCount = 0
            const mockResolver = {
                GetPropertyValue: sandbox.stub().callsFake(() => {
                    callCount++
                    return Promise.resolve(`value-${callCount}`)
                })
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.PropertyConfiguration = {
                create: [{ 
                    name: '[bake.variables.name]', 
                    value: '[bake.variables.value]'
                }],
                update: undefined,
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            expect(config.PropertyConfiguration!.create![0].name).to.equal('value-1')
            expect(config.PropertyConfiguration!.create![0].value).to.equal('value-2')
        })

        it('processes multiple configuration items in order', async () => {
            const { logger } = createLogger()
            let callOrder: number[] = []
            let callIndex = 0
            const mockResolver = {
                GetPropertyValue: sandbox.stub().callsFake(() => {
                    callOrder.push(callIndex++)
                    return Promise.resolve(`resolved-${callIndex}`)
                })
            } as unknown as ConfigurationValueResolver
            const variableResolver = new VariableResolver(logger, mockResolver)
            
            const config = new PropertyServiceConfiguration()
            config.PropertyConfiguration = {
                create: [
                    { name: 'prop1', value: '[bake.variables.v1]' },
                    { name: 'prop2', value: '[bake.variables.v2]' }
                ],
                update: undefined,
                delete: undefined
            }

            await variableResolver.ResolveBakeVariables(config)

            expect(callOrder).to.deep.equal([0, 1])
        })
    })
})
