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

import { EventHubPlugin } from '../src/plugin'
import { EventHubUtils } from '../src/functions'

// Require the compiled modules to verify exports
const eventHubIndex = require('../dist/index')

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
            type: '@azbake/ingredient-event-hub',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-event-hub index exports', () => {
    it('exports plugin', () => {
        expect(eventHubIndex.plugin).to.not.be.undefined
        expect(typeof eventHubIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(eventHubIndex.pluginNS).to.equal('@azbake/ingredient-event-hub')
    })

    it('exports functions', () => {
        expect(eventHubIndex.functions).to.not.be.undefined
        expect(typeof eventHubIndex.functions).to.equal('function')
        expect(eventHubIndex.functions.name).to.equal('EventHubUtils')
    })

    it('exports functionsNS', () => {
        expect(eventHubIndex.functionsNS).to.equal('eventhub')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = eventHubIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = eventHubIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('EventHubPlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys event hub template with default resource group', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubName', new BakeVariable('myeventhub'))
            params.set('eventHubNamespaceName', new BakeVariable('my-namespace'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                eventHubName: { value: 'myeventhub' },
                eventHubNamespaceName: { value: 'my-namespace' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployTemplate.firstCall.args[3]).to.equal('test-rg')
        })

        it('deploys event hub template with custom resource group', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubName', new BakeVariable('myeventhub'))
            params.set('eventHubNamespaceResourceGroup', new BakeVariable('custom-rg'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                eventHubName: { value: 'myeventhub' },
                eventHubNamespaceResourceGroup: { value: 'custom-rg' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployTemplate.firstCall.args[3]).to.equal('custom-rg')
        })

        it('removes eventHubNamespaceResourceGroup from ARM params', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubName', new BakeVariable('myeventhub'))
            params.set('eventHubNamespaceResourceGroup', new BakeVariable('custom-rg'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                eventHubName: { value: 'myeventhub' },
                eventHubNamespaceResourceGroup: { value: 'custom-rg' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedParams.eventHubNamespaceResourceGroup).to.be.undefined
            expect(capturedParams.eventHubName).to.deep.equal({ value: 'myeventhub' })
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubName', new BakeVariable('myeventhub'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Event Hub deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                eventHubName: { value: 'myeventhub' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubPlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Event Hub deployment failed')
            }
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubName', new BakeVariable('myeventhub'))
            
            const source = new BakeVariable('my-event-hub-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                eventHubName: { value: 'myeventhub' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubName', new BakeVariable('myeventhub'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedCtx: any = null
            const ARMHelperStub = sandbox.stub().callsFake((ctxArg: any) => {
                capturedCtx = ctxArg
                return {
                    DeployTemplate: sandbox.stub().resolves({}),
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({})
                }
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubPlugin('test', ingredient, ctx)
            await plugin.Execute()

                expect(capturedCtx).to.not.be.null
                expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('passes ingredient name to BakeParamsToARMParamsAsync', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubName', new BakeVariable('myeventhub'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubPlugin('my-event-hub-name', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.calledWith('my-event-hub-name', params)).to.be.true
        })
    })
})
