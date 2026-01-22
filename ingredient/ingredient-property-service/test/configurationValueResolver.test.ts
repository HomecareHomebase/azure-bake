import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import {
    BakeVariable,
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IIngredient,
    Logger
} from '@azbake/core'

import { ConfigurationValueResolver } from '../src/configuration/configurationValueResolver'

function createLogger() {
    const logs: string[] = []
    const errors: string[] = []
    const logger = {
        log: (msg: string) => logs.push(msg),
        error: (msg: string) => errors.push(msg),
        debug: (msg: string) => logs.push(msg)
    } as unknown as Logger

    return { logger, logs, errors }
}

function createIngredient(parameters?: Map<string, BakeVariable>): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-property-service',
            source: new BakeVariable({ baseUrl: 'https://base', resourceUrl: 'https://resource' } as any),
            parameters: parameters || new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

function createContext(ingredient?: IIngredient): DeploymentContext {
    const config: IBakeConfig = {
        name: 'test',
        shortName: 'pkg',
        version: '1.0.0',
        resourceGroup: false,
        recipe: new Map(),
        variables: new Map()
    }

    const env: IBakeEnvironment = {
        toolVersion: '0.0.0',
        environmentName: 'Dev',
        environmentCode: 'dev',
        regions: [{ name: 'East', shortName: 'east', code: 'eus' }],
        authentication: {
            subscriptionId: 'sub',
            tenantId: 'tenant',
            serviceId: 'service',
            secretKey: 'secret',
            certPath: '',
            skipAuth: true
        },
        variables: new Map(),
        logLevel: 'info'
    }

    const pkg: IBakePackage = {
        Config: config,
        Environment: env,
        Authenticate: async () => true
    }

    const defaultIngredient = ingredient || createIngredient()

    const { logger } = createLogger()
    return new DeploymentContext({} as any, pkg, env.regions[0] as IBakeRegion, logger, defaultIngredient)
}

describe('ConfigurationValueResolver', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('GetPropertyByType', () => {
        it('returns null when parameter type does not exist', async () => {
            const { logger, logs } = createLogger()
            const context = createContext()
            const ingredient = createIngredient()

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            const result = await resolver.GetPropertyByType<any>('nonexistent')

            expect(result).to.equal(null)
            expect(logs.some(msg => msg.includes('is null'))).to.equal(true)
        })

        it('returns resolved value when parameter type exists', async () => {
            const { logger, logs } = createLogger()
            const context = createContext()
            
            const expectedValue = { create: [{ name: 'test', value: 'value' }] }
            const mockBakeVariable = {
                valueAsync: sandbox.stub().resolves(expectedValue)
            } as unknown as BakeVariable
            
            const parameters = new Map<string, BakeVariable>()
            parameters.set('properties', mockBakeVariable)
            const ingredient = createIngredient(parameters)

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            const result = await resolver.GetPropertyByType<any>('properties')

            expect(result).to.deep.equal(expectedValue)
            expect(logs.some(msg => msg.includes('properties'))).to.equal(true)
        })

        it('logs the resolved value as JSON', async () => {
            const { logger, logs } = createLogger()
            const context = createContext()
            
            const expectedValue = { foo: 'bar' }
            const mockBakeVariable = {
                valueAsync: sandbox.stub().resolves(expectedValue)
            } as unknown as BakeVariable
            
            const parameters = new Map<string, BakeVariable>()
            parameters.set('test-type', mockBakeVariable)
            const ingredient = createIngredient(parameters)

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            await resolver.GetPropertyByType<any>('test-type')

            expect(logs.some(msg => msg.includes(JSON.stringify(expectedValue)))).to.equal(true)
        })

        it('handles secrets parameter type', async () => {
            const { logger } = createLogger()
            const context = createContext()
            
            const secretConfig = { create: [{ name: 'secret1', value: 'secretval' }] }
            const mockBakeVariable = {
                valueAsync: sandbox.stub().resolves(secretConfig)
            } as unknown as BakeVariable
            
            const parameters = new Map<string, BakeVariable>()
            parameters.set('secrets', mockBakeVariable)
            const ingredient = createIngredient(parameters)

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            const result = await resolver.GetPropertyByType<any>('secrets')

            expect(result).to.deep.equal(secretConfig)
        })
    })

    describe('GetPropertyValue', () => {
        it('resolves bake variable to its value', async () => {
            const { logger } = createLogger()
            const context = createContext()
            const ingredient = createIngredient()

            const mockBakeVariable = {
                valueAsync: sandbox.stub().resolves('resolved-string-value')
            } as unknown as BakeVariable

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            const result = await resolver.GetPropertyValue<string>(mockBakeVariable)

            expect(result).to.equal('resolved-string-value')
        })

        it('resolves bake variable to object value', async () => {
            const { logger } = createLogger()
            const context = createContext()
            const ingredient = createIngredient()

            const expectedObject = { key1: 'value1', key2: 123 }
            const mockBakeVariable = {
                valueAsync: sandbox.stub().resolves(expectedObject)
            } as unknown as BakeVariable

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            const result = await resolver.GetPropertyValue<object>(mockBakeVariable)

            expect(result).to.deep.equal(expectedObject)
        })

        it('resolves bake variable to number value', async () => {
            const { logger } = createLogger()
            const context = createContext()
            const ingredient = createIngredient()

            const mockBakeVariable = {
                valueAsync: sandbox.stub().resolves(42)
            } as unknown as BakeVariable

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            const result = await resolver.GetPropertyValue<number>(mockBakeVariable)

            expect(result).to.equal(42)
        })

        it('resolves bake variable to array value', async () => {
            const { logger } = createLogger()
            const context = createContext()
            const ingredient = createIngredient()

            const expectedArray = ['item1', 'item2', 'item3']
            const mockBakeVariable = {
                valueAsync: sandbox.stub().resolves(expectedArray)
            } as unknown as BakeVariable

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            const result = await resolver.GetPropertyValue<string[]>(mockBakeVariable)

            expect(result).to.deep.equal(expectedArray)
        })

        it('passes context to bake variable valueAsync', async () => {
            const { logger } = createLogger()
            const context = createContext()
            const ingredient = createIngredient()

            const mockBakeVariable = {
                valueAsync: sandbox.stub().resolves('value')
            } as unknown as BakeVariable

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            await resolver.GetPropertyValue<string>(mockBakeVariable)

            expect((mockBakeVariable.valueAsync as sinon.SinonStub).calledWith(context)).to.equal(true)
        })

        it('handles null resolved value', async () => {
            const { logger } = createLogger()
            const context = createContext()
            const ingredient = createIngredient()

            const mockBakeVariable = {
                valueAsync: sandbox.stub().resolves(null)
            } as unknown as BakeVariable

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            const result = await resolver.GetPropertyValue<any>(mockBakeVariable)

            expect(result).to.equal(null)
        })

        it('handles undefined resolved value', async () => {
            const { logger } = createLogger()
            const context = createContext()
            const ingredient = createIngredient()

            const mockBakeVariable = {
                valueAsync: sandbox.stub().resolves(undefined)
            } as unknown as BakeVariable

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            const result = await resolver.GetPropertyValue<any>(mockBakeVariable)

            expect(result).to.equal(undefined)
        })

        it('resolves date values', async () => {
            const { logger } = createLogger()
            const context = createContext()
            const ingredient = createIngredient()

            const expectedDate = new Date('2025-06-15T10:30:00Z')
            const mockBakeVariable = {
                valueAsync: sandbox.stub().resolves(expectedDate)
            } as unknown as BakeVariable

            const resolver = new ConfigurationValueResolver(logger, context, ingredient)
            const result = await resolver.GetPropertyValue<Date>(mockBakeVariable)

            expect(result).to.deep.equal(expectedDate)
        })
    })
})
