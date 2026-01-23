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

import { TrafficManager } from '../src/plugin'
import { TrafficUtils } from '../src/functions'

// Require the compiled modules to verify exports
const trafficIndex = require('../dist/index')

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

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable, alerts?: Map<string, any>): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-traffic-manager',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: alerts || new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-traffic-manager index exports', () => {
    it('exports plugin', () => {
        expect(trafficIndex.plugin).to.not.be.undefined
        expect(typeof trafficIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(trafficIndex.pluginNS).to.equal('@azbake/ingredient-traffic-manager')
    })

    it('exports functions', () => {
        expect(trafficIndex.functions).to.not.be.undefined
        expect(typeof trafficIndex.functions).to.equal('function')
        expect(trafficIndex.functions.name).to.equal('TrafficUtils')
    })

    it('exports functionsNS', () => {
        expect(trafficIndex.functionsNS).to.equal('traffic')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = trafficIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = trafficIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('TrafficUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('constructor', () => {
        it('initializes with context', () => {
            const ctx = createContext()
            const utils = new TrafficUtils(ctx)
            expect(utils.context).to.equal(ctx)
        })
    })

    describe('get_profile', () => {
        it('creates traffic manager profile name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobtrfmgrtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new TrafficUtils(ctx)
            const result = utils.get_profile()

            expect(result).to.equal('devglobtrfmgrtst')
            expect(mockUtils.create_resource_name.calledWith('trfmgr', null, false)).to.be.true
        })

        it('returns profile name with different region codes', () => {
            const ctx = createContext({ name: 'East US', shortName: 'eastus', code: 'eus' })
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveustrfmgrtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new TrafficUtils(ctx)
            const result = utils.get_profile()

            expect(result).to.equal('deveustrfmgrtst')
        })

        it('calls IngredientManager with coreutils namespace', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('profilename')
            }
            const getIngredientFunctionStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new TrafficUtils(ctx)
            utils.get_profile()

            expect(getIngredientFunctionStub.calledWith('coreutils', ctx)).to.be.true
        })
    })
})

describe('TrafficManager Plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('constructor', () => {
        it('creates instance with ARMHelper', () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const plugin = new TrafficManager('test-name', ingredient, ctx)
            
            expect(plugin._name).to.equal('test-name')
            expect(plugin._ctx).to.not.be.undefined
            // _helper is lazily initialized, so it should be undefined before Execute() is called
            expect(plugin._helper).to.be.undefined
        })

        it('stores ingredient reference', () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const plugin = new TrafficManager('test', ingredient, ctx)
            
            expect(plugin._ingredient).to.equal(ingredient)
        })
    })

    describe('Execute', () => {
        it('deploys profile and endpoint when primary region', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[rg]/mywebapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext({ name: 'East US', shortName: 'eastus', code: 'eus' }, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(true),
                create_resource_name: sandbox.stub().returns('deveustrfmgrtst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'mywebapp' }),
                resource_group: sandbox.stub().resolves('test-rg'),
                primary_region: sandbox.stub().returns({ name: 'East US', shortName: 'eastus', code: 'eus' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                'source-type': { value: 'webapp' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            const mockDeployAlerts = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockUtils.current_region_primary.called).to.be.true
        })

        it('skips profile deployment when not primary region', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[rg]/mywebapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext({ name: 'West US', shortName: 'westus', code: 'wus' }, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(false),
                create_resource_name: sandbox.stub().returns('devwustrfmgrtst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'mywebapp' }),
                resource_group: sandbox.stub().resolves('test-rg'),
                primary_region: sandbox.stub().returns({ name: 'East US', shortName: 'eastus', code: 'eus' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                'source-type': { value: 'webapp' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            const mockDeployAlerts = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockUtils.current_region_primary.called).to.be.true
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[rg]/mywebapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().throws(new Error('Region check failed'))
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const plugin = new TrafficManager('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Region check failed')
            }
        })

        it('always deploys endpoint regardless of primary region status', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[rg]/mywebapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext({ name: 'West US', shortName: 'westus', code: 'wus' }, ingredient)

            const mockUtils = {
                current_region_primary: sandbox.stub().returns(false),
                create_resource_name: sandbox.stub().returns('devwuseptst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'mywebapp' }),
                resource_group: sandbox.stub().resolves('test-rg'),
                primary_region: sandbox.stub().returns({ name: 'East US', shortName: 'eastus', code: 'eus' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.Execute()

            // Endpoint deployment should happen even when not primary region
            expect(mockDeployTemplate.called).to.be.true
        })
    })

    describe('DeployProfile', () => {
        it('deploys profile template with diagnostics', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobtrfmgrtst'),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.DeployProfile()

            expect(mockConfigureDiagnostics.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
        })

        it('sets the profile name parameter', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('myprofilename'),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.DeployProfile()

            expect(capturedParams).to.not.be.null
            expect(capturedParams.name).to.deep.equal({ value: 'myprofilename' })
        })

        it('uses correct deployment name suffix', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobtrfmgrtst'),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedDeploymentName: string = ''
            const mockDeployTemplate = sandbox.stub().callsFake((name) => {
                capturedDeploymentName = name
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('mytraffic', ingredient, ctx)
            await plugin.DeployProfile()

            expect(capturedDeploymentName).to.equal('mytraffic-profile')
        })

        it('logs and throws error on profile deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobtrfmgrtst'),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Profile deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            
            try {
                await plugin.DeployProfile()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Profile deployment failed')
            }
        })

        it('resolves resource group from coreutils', async () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobtrfmgrtst'),
                resource_group: sandbox.stub().resolves('custom-resource-group')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedResourceGroup: string = ''
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                capturedResourceGroup = rg
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.DeployProfile()

            expect(capturedResourceGroup).to.equal('custom-resource-group')
            expect(mockUtils.resource_group.called).to.be.true
        })
    })

    describe('DeployEndpoint', () => {
        it('deploys endpoint and alerts', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[rg]/mywebapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobeptst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'mywebapp' }),
                resource_group: sandbox.stub().resolves('test-rg'),
                primary_region: sandbox.stub().returns({ name: 'East US', shortName: 'eastus', code: 'eus' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.DeployEndpoint()

            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployAlerts.called).to.be.true
        })

        it('sets endpoint parameters correctly', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('Microsoft.Web/sites'))
            
            const source = new BakeVariable('[myresourcegroup]/mywebappname')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobeptst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'myresourcegroup', resource: 'mywebappname' }),
                resource_group: sandbox.stub().resolves('primary-rg'),
                primary_region: sandbox.stub().returns({ name: 'East US', shortName: 'eastus', code: 'eus' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.DeployEndpoint()

            expect(capturedParams['source-rg']).to.deep.equal({ value: 'myresourcegroup' })
            expect(capturedParams['source-name']).to.deep.equal({ value: 'mywebappname' })
            expect(capturedParams['source-type']).to.deep.equal({ value: 'Microsoft.Web/sites' })
        })

        it('uses correct deployment name suffix for endpoint', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[rg]/mywebapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobeptst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'mywebapp' }),
                resource_group: sandbox.stub().resolves('test-rg'),
                primary_region: sandbox.stub().returns({ name: 'East US', shortName: 'eastus', code: 'eus' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedDeploymentName: string = ''
            const mockDeployTemplate = sandbox.stub().callsFake((name) => {
                capturedDeploymentName = name
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('myendpoint', ingredient, ctx)
            await plugin.DeployEndpoint()

            expect(capturedDeploymentName).to.equal('myendpoint-endpoint')
        })

        it('deploys to primary region resource group', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[rg]/mywebapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext({ name: 'West US', shortName: 'westus', code: 'wus' }, ingredient)

            const primaryRegion = { name: 'East US', shortName: 'eastus', code: 'eus' }
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devwuseptst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'mywebapp' }),
                resource_group: sandbox.stub().resolves('primary-region-rg'),
                primary_region: sandbox.stub().returns(primaryRegion)
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedResourceGroup: string = ''
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                capturedResourceGroup = rg
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.DeployEndpoint()

            // Verify resource_group was called with params for primary region
            expect(mockUtils.resource_group.calledWith(null, true, primaryRegion)).to.be.true
        })

        it('passes alert overrides to DeployAlerts', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[rg]/mywebapp')
            const alertOverrides = new Map<string, any>()
            alertOverrides.set('customAlert', { threshold: 100 })
            const ingredient = createIngredient(params, source, alertOverrides)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobeptst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'mywebapp' }),
                resource_group: sandbox.stub().resolves('test-rg'),
                primary_region: sandbox.stub().returns({ name: 'East US', shortName: 'eastus', code: 'eus' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            let capturedAlertOverrides: any = null
            const mockDeployAlerts = sandbox.stub().callsFake((name, rg, target, stockAlerts, overrides) => {
                capturedAlertOverrides = overrides
                return Promise.resolve({})
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.DeployEndpoint()

            expect(capturedAlertOverrides).to.equal(alertOverrides)
        })

        it('logs and throws error on endpoint deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[rg]/mywebapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobeptst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'mywebapp' }),
                resource_group: sandbox.stub().resolves('test-rg'),
                primary_region: sandbox.stub().returns({ name: 'East US', shortName: 'eastus', code: 'eus' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Endpoint deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            
            try {
                await plugin.DeployEndpoint()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Endpoint deployment failed')
            }
        })

        it('throws error when alert deployment fails', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[rg]/mywebapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobeptst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'mywebapp' }),
                resource_group: sandbox.stub().resolves('test-rg'),
                primary_region: sandbox.stub().returns({ name: 'East US', shortName: 'eastus', code: 'eus' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const alertError = new Error('Alert deployment failed')
            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().rejects(alertError)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            
            try {
                await plugin.DeployEndpoint()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Alert deployment failed')
            }
        })

        it('parses source parameter to extract resource details', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[production-rg]/production-webapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobeptst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'production-rg', resource: 'production-webapp' }),
                resource_group: sandbox.stub().resolves('test-rg'),
                primary_region: sandbox.stub().returns({ name: 'East US', shortName: 'eastus', code: 'eus' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.DeployEndpoint()

            expect(mockUtils.parseResource.called).to.be.true
        })

        it('uses profile name from TrafficUtils as alert target', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('source-type', new BakeVariable('webapp'))
            
            const source = new BakeVariable('[rg]/mywebapp')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobtrfmgrtst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'mywebapp' }),
                resource_group: sandbox.stub().resolves('test-rg'),
                primary_region: sandbox.stub().returns({ name: 'East US', shortName: 'eastus', code: 'eus' })
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            let capturedAlertTarget: string = ''
            const mockDeployAlerts = sandbox.stub().callsFake((name, rg, target) => {
                capturedAlertTarget = target
                return Promise.resolve({})
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new TrafficManager('test', ingredient, ctx)
            await plugin.DeployEndpoint()

            expect(capturedAlertTarget).to.equal('devglobtrfmgrtst')
        })
    })
})
