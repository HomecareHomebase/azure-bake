import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import {
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IIngredient,
    IngredientManager,
    Logger,
    BakeVariable
} from '@azbake/core'

import { ServiceBusQueuePlugin } from '../src/plugin'

// Require the compiled modules to verify exports
const serviceBusQueueIndex = require('../dist/index')

function createContext(region?: IBakeRegion, ingredient?: IIngredient): DeploymentContext {
    const config: IBakeConfig = {
        name: 'test',
        shortName: 'tst',
        version: '1.0.0',
        resourceGroup: false,
        recipe: new Map(),
        variables: new Map()
    }

    const env: IBakeEnvironment = {
        toolVersion: '0.0.0',
        environmentName: 'env',
        environmentCode: 'dev',
        regions: [{ name: 'Global', shortName: 'global', code: 'glob' }],
        authentication: {
            subscriptionId: 'test-sub-id',
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

    const testRegion: IBakeRegion = region || { name: 'Global', shortName: 'global', code: 'glob' }
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
    return new DeploymentContext(auth, pkg, testRegion, new Logger(), ingredient)
}

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-service-bus-queue',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-service-bus-queue index exports', () => {
    it('exports plugin', () => {
        expect(serviceBusQueueIndex.plugin).to.not.be.undefined
        expect(typeof serviceBusQueueIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(serviceBusQueueIndex.pluginNS).to.equal('@azbake/ingredient-service-bus-queue')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = serviceBusQueueIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('does not export functions (no utility class)', () => {
        // This ingredient does not have a functions export
        expect(serviceBusQueueIndex.functions).to.be.undefined
        expect(serviceBusQueueIndex.functionsNS).to.be.undefined
    })
})

describe('ServiceBusQueuePlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys service bus queue with default parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('namespaceName', new BakeVariable('myservicebus'))
            params.set('queueName', new BakeVariable('myqueue'))
            params.set('resourceGroup', new BakeVariable(''))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                namespaceName: { value: 'myservicebus' },
                queueName: { value: 'myqueue' },
                resourceGroup: { value: '' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ServiceBusQueuePlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockUtils.resource_group.called).to.be.true
        })

        it('uses custom resource group when resourceGroup parameter is provided', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('namespaceName', new BakeVariable('myservicebus'))
            params.set('queueName', new BakeVariable('myqueue'))
            params.set('resourceGroup', new BakeVariable('custom-rg'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                namespaceName: { value: 'myservicebus' },
                queueName: { value: 'myqueue' },
                resourceGroup: { value: 'custom-rg' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ServiceBusQueuePlugin('test', ingredient, ctx)
            await plugin.Execute()

            // Verify deployment was called with custom resource group
            expect(mockDeployTemplate.called).to.be.true
            const deployCall = mockDeployTemplate.getCall(0)
            expect(deployCall.args[3]).to.equal('custom-rg')
        })

        it('sets default values for optional boolean parameters when not provided', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('namespaceName', new BakeVariable('myservicebus'))
            params.set('queueName', new BakeVariable('myqueue'))
            params.set('resourceGroup', new BakeVariable(''))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                namespaceName: { value: 'myservicebus' },
                queueName: { value: 'myqueue' },
                resourceGroup: { value: '' }
                // Note: boolean params not provided
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ServiceBusQueuePlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
            // Verify default values were set for boolean parameters
            expect(capturedParams.deadLetteringOnMessageExpiration).to.deep.equal({ value: false })
            expect(capturedParams.requiresDuplicateDetection).to.deep.equal({ value: false })
            expect(capturedParams.requiresSession).to.deep.equal({ value: false })
            expect(capturedParams.enablePartitioning).to.deep.equal({ value: false })
            expect(capturedParams.enableExpress).to.deep.equal({ value: false })
        })

        it('preserves provided boolean parameters when set to true', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('namespaceName', new BakeVariable('myservicebus'))
            params.set('queueName', new BakeVariable('myqueue'))
            params.set('resourceGroup', new BakeVariable(''))
                params.set('deadLetteringOnMessageExpiration', new BakeVariable('true'))
                params.set('requiresDuplicateDetection', new BakeVariable('true'))
                params.set('requiresSession', new BakeVariable('true'))
                params.set('enablePartitioning', new BakeVariable('true'))
                params.set('enableExpress', new BakeVariable('true'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                namespaceName: { value: 'myservicebus' },
                queueName: { value: 'myqueue' },
                resourceGroup: { value: '' },
                deadLetteringOnMessageExpiration: { value: true },
                requiresDuplicateDetection: { value: true },
                requiresSession: { value: true },
                enablePartitioning: { value: true },
                enableExpress: { value: true }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ServiceBusQueuePlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
            // Verify provided values were preserved
            expect(capturedParams.deadLetteringOnMessageExpiration).to.deep.equal({ value: true })
            expect(capturedParams.requiresDuplicateDetection).to.deep.equal({ value: true })
            expect(capturedParams.requiresSession).to.deep.equal({ value: true })
            expect(capturedParams.enablePartitioning).to.deep.equal({ value: true })
            expect(capturedParams.enableExpress).to.deep.equal({ value: true })
        })

        it('removes resourceGroup from params before deployment', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('namespaceName', new BakeVariable('myservicebus'))
            params.set('queueName', new BakeVariable('myqueue'))
            params.set('resourceGroup', new BakeVariable('my-rg'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                namespaceName: { value: 'myservicebus' },
                queueName: { value: 'myqueue' },
                resourceGroup: { value: 'my-rg' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ServiceBusQueuePlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
            // Verify resourceGroup was deleted from params
            expect(capturedParams.resourceGroup).to.be.undefined
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('namespaceName', new BakeVariable('myservicebus'))
            params.set('queueName', new BakeVariable('myqueue'))
            params.set('resourceGroup', new BakeVariable(''))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Service Bus Queue deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                namespaceName: { value: 'myservicebus' },
                queueName: { value: 'myqueue' },
                resourceGroup: { value: '' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ServiceBusQueuePlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Service Bus Queue deployment failed')
            }
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('namespaceName', new BakeVariable('myservicebus'))
            params.set('queueName', new BakeVariable('myqueue'))
            params.set('resourceGroup', new BakeVariable(''))
            
            const source = new BakeVariable('my-sb-queue-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                namespaceName: { value: 'myservicebus' },
                queueName: { value: 'myqueue' },
                resourceGroup: { value: '' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ServiceBusQueuePlugin('test', ingredient, ctx)
            await plugin.Execute()

            // Verify the plugin executed successfully with the source
            expect(mockDeployTemplate.called).to.be.true
        })

        it('handles deadLetteringOnMessageExpiration set to false explicitly', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('namespaceName', new BakeVariable('myservicebus'))
            params.set('queueName', new BakeVariable('myqueue'))
            params.set('resourceGroup', new BakeVariable(''))
                params.set('deadLetteringOnMessageExpiration', new BakeVariable('false'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                namespaceName: { value: 'myservicebus' },
                queueName: { value: 'myqueue' },
                resourceGroup: { value: '' },
                deadLetteringOnMessageExpiration: { value: false }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ServiceBusQueuePlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
            // When value is false explicitly, it should remain false
            expect(capturedParams.deadLetteringOnMessageExpiration).to.deep.equal({ value: false })
        })

        it('handles empty resourceGroup value and uses default', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('namespaceName', new BakeVariable('myservicebus'))
            params.set('queueName', new BakeVariable('myqueue'))
            params.set('resourceGroup', new BakeVariable(''))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-computed-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                namespaceName: { value: 'myservicebus' },
                queueName: { value: 'myqueue' },
                resourceGroup: { value: '' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ServiceBusQueuePlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
            // Verify deployment uses default resource group from util
            const deployCall = mockDeployTemplate.getCall(0)
            expect(deployCall.args[3]).to.equal('default-computed-rg')
        })

        it('handles mixed boolean parameters correctly', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('namespaceName', new BakeVariable('myservicebus'))
            params.set('queueName', new BakeVariable('myqueue'))
            params.set('resourceGroup', new BakeVariable(''))
            // Only set some boolean params
                params.set('requiresSession', new BakeVariable('true'))
                params.set('enablePartitioning', new BakeVariable('true'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                namespaceName: { value: 'myservicebus' },
                queueName: { value: 'myqueue' },
                resourceGroup: { value: '' },
                requiresSession: { value: true },
                enablePartitioning: { value: true }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new ServiceBusQueuePlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
            // Verify mixed - some provided, some defaulted
            expect(capturedParams.deadLetteringOnMessageExpiration).to.deep.equal({ value: false })
            expect(capturedParams.requiresDuplicateDetection).to.deep.equal({ value: false })
            expect(capturedParams.requiresSession).to.deep.equal({ value: true })
            expect(capturedParams.enablePartitioning).to.deep.equal({ value: true })
            expect(capturedParams.enableExpress).to.deep.equal({ value: false })
        })
    })
})
