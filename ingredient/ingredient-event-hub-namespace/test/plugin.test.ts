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

import { EventHubNamespacePlugin } from '../src/plugin'
import { EventHubNamespaceUtils } from '../src/functions'

// Require the compiled modules to verify exports
const eventHubNamespaceIndex = require('../dist/index')

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

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable, alerts?: Map<string, BakeVariable>): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-event-hub-namespace',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: alerts || new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-event-hub-namespace index exports', () => {
    it('exports plugin', () => {
        expect(eventHubNamespaceIndex.plugin).to.not.be.undefined
        expect(typeof eventHubNamespaceIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(eventHubNamespaceIndex.pluginNS).to.equal('@azbake/ingredient-event-hub-namespace')
    })

    it('exports functions', () => {
        expect(eventHubNamespaceIndex.functions).to.not.be.undefined
        expect(typeof eventHubNamespaceIndex.functions).to.equal('function')
        expect(eventHubNamespaceIndex.functions.name).to.equal('EventHubNamespaceUtils')
    })

    it('exports functionsNS', () => {
        expect(eventHubNamespaceIndex.functionsNS).to.equal('eventhubnamespace')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = eventHubNamespaceIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = eventHubNamespaceIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('EventHubNamespaceUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('get_resource_name', () => {
        it('creates event hub namespace resource name using coreutils with default shortName', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobehntst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new EventHubNamespaceUtils(ctx)
            const result = utils.get_resource_name()

            expect(result).to.equal('devglobehntst')
            expect(mockUtils.create_resource_name.calledWith('ehn', null, true)).to.be.true
        })

        it('creates event hub namespace resource name with custom shortName', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobehncustom')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new EventHubNamespaceUtils(ctx)
            const result = utils.get_resource_name('custom')

            expect(result).to.equal('devglobehncustom')
            expect(mockUtils.create_resource_name.calledWith('ehn', 'custom', true)).to.be.true
        })
    })

    describe('get_resource_profile', () => {
        it('returns resource group and name profile', async () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobehntst'),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new EventHubNamespaceUtils(ctx)
            const result = await utils.get_resource_profile()

            expect(result).to.equal('test-rg/devglobehntst')
        })

        it('uses custom shortName and rgShortName', async () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobehncustom'),
                resource_group: sandbox.stub().resolves('custom-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new EventHubNamespaceUtils(ctx)
            const result = await utils.get_resource_profile('custom', 'customrg')

            expect(result).to.equal('custom-rg/devglobehncustom')
            expect(mockUtils.resource_group.calledWith('customrg')).to.be.true
        })
    })

    describe('get_authorizationrule', () => {
        it('returns authorization rule from event hub namespace', async () => {
            const ctx = createContext()

            const mockAuthRule = {
                id: '/subscriptions/sub-id/resourceGroups/test-rg/providers/Microsoft.EventHub/namespaces/my-namespace/authorizationRules/my-rule',
                name: 'my-rule',
                rights: ['Listen', 'Send']
            }

            const mockEventHubClient = {
                namespaces: {
                    getAuthorizationRule: sandbox.stub().resolves(mockAuthRule)
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubNamespaceUtils(ctx)
            const result = await utils.get_authorizationrule('test-rg', 'my-namespace', 'my-rule')

            expect(result).to.deep.equal(mockAuthRule)
            expect(mockEventHubClient.namespaces.getAuthorizationRule.calledWith('test-rg', 'my-namespace', 'my-rule')).to.be.true
        })

        it('uses correct subscription ID from context', async () => {
            const ctx = createContext()

            const mockEventHubClient = {
                namespaces: {
                    getAuthorizationRule: sandbox.stub().resolves({})
                }
            }

            const armEventhub = require('@azure/arm-eventhub')
            const clientStub = sandbox.stub(armEventhub, 'EventHubManagementClient').returns(mockEventHubClient)

            const utils = new EventHubNamespaceUtils(ctx)
            await utils.get_authorizationrule('test-rg', 'my-namespace', 'my-rule')

            expect(clientStub.calledWith(ctx.AuthToken, 'test-sub-id')).to.be.true
        })
    })
})

describe('EventHubNamespacePlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys event hub namespace template with diagnostics', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubNamespaceName', new BakeVariable('my-namespace'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                eventHubNamespaceName: { value: 'my-namespace' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubNamespacePlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockConfigureDiagnostics.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployAlerts.called).to.be.true
        })

        it('deploys alerts with correct parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubNamespaceName', new BakeVariable('my-namespace'))
            
            const alertOverrides = new Map<string, BakeVariable>()
            alertOverrides.set('severity', new BakeVariable('2'))
            
            const ingredient = createIngredient(params, undefined, alertOverrides)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                eventHubNamespaceName: { value: 'my-namespace' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: sandbox.stub().callsFake((params) => params),
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubNamespacePlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployAlerts.calledWith('test', 'test-rg', 'my-namespace', sinon.match.any, alertOverrides)).to.be.true
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubNamespaceName', new BakeVariable('my-namespace'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Event Hub Namespace deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                eventHubNamespaceName: { value: 'my-namespace' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: sandbox.stub().callsFake((params) => params),
                DeployAlerts: sandbox.stub().resolves({})
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubNamespacePlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Event Hub Namespace deployment failed')
            }
        })

        it('throws error when alert deployment fails', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubNamespaceName', new BakeVariable('my-namespace'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const alertError = new Error('Alert deployment failed')
            const mockDeployAlerts = sandbox.stub().rejects(alertError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                eventHubNamespaceName: { value: 'my-namespace' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: sandbox.stub().callsFake((params) => params),
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubNamespacePlugin('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Alert deployment failed')
            }
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubNamespaceName', new BakeVariable('my-namespace'))
            
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
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({ eventHubNamespaceName: { value: 'my-namespace' } }),
                    ConfigureDiagnostics: sandbox.stub().callsFake((params) => params),
                    DeployAlerts: sandbox.stub().resolves({})
                }
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubNamespacePlugin('test', ingredient, ctx)
            await plugin.Execute()

                expect(capturedCtx).to.not.be.null
                expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('uses eventHubNamespaceName as alert target', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('eventHubNamespaceName', new BakeVariable('my-specific-namespace'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                eventHubNamespaceName: { value: 'my-specific-namespace' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: sandbox.stub().callsFake((params) => params),
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new EventHubNamespacePlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployAlerts.firstCall.args[2]).to.equal('my-specific-namespace')
        })
    })
})
