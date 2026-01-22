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

import { WebAppContainer } from '../src/plugin'
import { WebAppUtils } from '../src/functions'

// Require the compiled modules to verify exports
const webappIndex = require('../dist/index')

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
        regions: [{ name: 'East US', shortName: 'eus', code: 'eus' }],
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

    const testRegion: IBakeRegion = region || { name: 'East US', shortName: 'eus', code: 'eus' }
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
    return new DeploymentContext(auth, pkg, testRegion, new Logger(), ingredient)
}

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable, tokens?: Map<string, BakeVariable>): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-webapp-container',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: tokens || new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-webapp-container index exports', () => {
    it('exports plugin', () => {
        expect(webappIndex.plugin).to.not.be.undefined
        expect(typeof webappIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(webappIndex.pluginNS).to.equal('@azbake/ingredient-webapp-container')
    })

    it('exports functions', () => {
        expect(webappIndex.functions).to.not.be.undefined
        expect(typeof webappIndex.functions).to.equal('function')
        expect(webappIndex.functions.name).to.equal('WebAppUtils')
    })

    it('exports functionsNS', () => {
        expect(webappIndex.functionsNS).to.equal('webapp')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = webappIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = webappIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('WebAppUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_profile', () => {
        it('creates webapp resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveuswebapptst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new WebAppUtils(ctx)
            const result = utils.create_profile()

            expect(result).to.equal('deveuswebapptst')
            expect(mockUtils.create_resource_name.calledWith('webapp', null, true)).to.be.true
        })

        it('returns unique name for each region', () => {
            const region1: IBakeRegion = { name: 'East US', shortName: 'eus', code: 'eus' }
            const region2: IBakeRegion = { name: 'West US', shortName: 'wus', code: 'wus' }
            
            const ctx1 = createContext(region1)
            const ctx2 = createContext(region2)

            const mockUtils1 = {
                create_resource_name: sandbox.stub().returns('deveuswebapptst')
            }
            const mockUtils2 = {
                create_resource_name: sandbox.stub().returns('devwuswebapptst')
            }
            
            const stub = sandbox.stub(IngredientManager, 'getIngredientFunction')
            stub.withArgs('coreutils', ctx1).returns(mockUtils1)
            stub.withArgs('coreutils', ctx2).returns(mockUtils2)

            const utils1 = new WebAppUtils(ctx1)
            const utils2 = new WebAppUtils(ctx2)

            const result1 = utils1.create_profile()
            const result2 = utils2.create_profile()

            expect(result1).to.equal('deveuswebapptst')
            expect(result2).to.equal('devwuswebapptst')
        })
    })

    describe('get_resource_profile', () => {
        it('returns resource group and webapp name combined', async () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveuswebapptst'),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new WebAppUtils(ctx)
            const result = await utils.get_resource_profile()

            expect(result).to.equal('test-rg/deveuswebapptst')
            expect(mockUtils.resource_group.called).to.be.true
        })

        it('combines correct resource group with webapp name', async () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('prodwebapp'),
                resource_group: sandbox.stub().resolves('production-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new WebAppUtils(ctx)
            const result = await utils.get_resource_profile()

            expect(result).to.equal('production-rg/prodwebapp')
        })
    })
})

describe('WebAppContainer Plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys webapp container template with required parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('container_image_name', new BakeVariable('myregistry.azurecr.io/myimage:latest'))
            params.set('container_registry_url', new BakeVariable('https://myregistry.azurecr.io'))
            params.set('container_registry_user', new BakeVariable('user'))
            params.set('container_registry_password', new BakeVariable('password'))
            
            const source = new BakeVariable('app-service-rg/my-app-service-plan')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'app-service-rg', resource: 'my-app-service-plan' }),
                create_resource_name: sandbox.stub().returns('deveuswebapptst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                container_image_name: { value: 'myregistry.azurecr.io/myimage:latest' },
                container_registry_url: { value: 'https://myregistry.azurecr.io' },
                container_registry_user: { value: 'user' },
                container_registry_password: { value: 'password' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new WebAppContainer('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployAlerts.called).to.be.true
            expect(mockUtils.resource_group.called).to.be.true
        })

        it('sets app service properties from source', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('container_image_name', new BakeVariable('myimage:v1'))
            params.set('container_registry_url', new BakeVariable('https://registry.io'))
            params.set('container_registry_user', new BakeVariable('admin'))
            params.set('container_registry_password', new BakeVariable('secret'))
            
            const source = new BakeVariable('my-app-rg/my-app-service')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'my-app-rg', resource: 'my-app-service' }),
                create_resource_name: sandbox.stub().returns('deveuswebapptst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new WebAppContainer('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedParams['app_service_rg'].value).to.equal('my-app-rg')
            expect(capturedParams['app_service_name'].value).to.equal('my-app-service')
        })

        it('sets webapp name using create_profile', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('container_image_name', new BakeVariable('myimage:v1'))
            params.set('container_registry_url', new BakeVariable('https://registry.io'))
            params.set('container_registry_user', new BakeVariable('admin'))
            params.set('container_registry_password', new BakeVariable('secret'))
            
            const source = new BakeVariable('rg/svc')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'svc' }),
                create_resource_name: sandbox.stub().returns('custom-webapp-name')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new WebAppContainer('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedParams['webapp_name'].value).to.equal('custom-webapp-name')
        })

        it('sets location from region context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('container_image_name', new BakeVariable('myimage:v1'))
            params.set('container_registry_url', new BakeVariable('https://registry.io'))
            params.set('container_registry_user', new BakeVariable('admin'))
            params.set('container_registry_password', new BakeVariable('secret'))
            
            const source = new BakeVariable('rg/svc')
            const region: IBakeRegion = { name: 'West US 2', shortName: 'wus2', code: 'wus2' }
            const ingredient = createIngredient(params, source)
            const ctx = createContext(region, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'svc' }),
                create_resource_name: sandbox.stub().returns('mywebapp')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new WebAppContainer('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedParams['location'].value).to.equal('West US 2')
        })

        it('adds tokens to app settings in ARM template', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('container_image_name', new BakeVariable('myimage:v1'))
            params.set('container_registry_url', new BakeVariable('https://registry.io'))
            params.set('container_registry_user', new BakeVariable('admin'))
            params.set('container_registry_password', new BakeVariable('secret'))
            
            const tokens = new Map<string, BakeVariable>()
            tokens.set('MY_CONFIG_VAR', new BakeVariable('config-value'))
            tokens.set('DATABASE_URL', new BakeVariable('postgres://localhost/db'))
            
            const source = new BakeVariable('rg/svc')
            const ingredient = createIngredient(params, source, tokens)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'svc' }),
                create_resource_name: sandbox.stub().returns('mywebapp')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedTemplate: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params) => {
                capturedTemplate = template
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new WebAppContainer('test', ingredient, ctx)
            await plugin.Execute()

            // Find the web site resource
            const webSiteResource = capturedTemplate.resources.find((r: any) => r.type === 'Microsoft.Web/sites')
            const appSettings = webSiteResource.properties.siteConfig.appSettings
            
            // Check that custom tokens were added
            const myConfigSetting = appSettings.find((s: any) => s.name === 'MY_CONFIG_VAR')
            const dbUrlSetting = appSettings.find((s: any) => s.name === 'DATABASE_URL')
            
            expect(myConfigSetting).to.not.be.undefined
            expect(myConfigSetting.value).to.equal('config-value')
            expect(dbUrlSetting).to.not.be.undefined
            expect(dbUrlSetting.value).to.equal('postgres://localhost/db')
        })

        it('updates existing token value if already present', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('container_image_name', new BakeVariable('myimage:v1'))
            params.set('container_registry_url', new BakeVariable('https://registry.io'))
            params.set('container_registry_user', new BakeVariable('admin'))
            params.set('container_registry_password', new BakeVariable('secret'))
            
            // Use a token name that matches one already in the ARM template
            const tokens = new Map<string, BakeVariable>()
            tokens.set('DOCKER_REGISTRY_SERVER_URL', new BakeVariable('https://custom-registry.io'))
            
            const source = new BakeVariable('rg/svc')
            const ingredient = createIngredient(params, source, tokens)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'svc' }),
                create_resource_name: sandbox.stub().returns('mywebapp')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedTemplate: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params) => {
                capturedTemplate = template
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new WebAppContainer('test', ingredient, ctx)
            await plugin.Execute()

            const webSiteResource = capturedTemplate.resources.find((r: any) => r.type === 'Microsoft.Web/sites')
            const appSettings = webSiteResource.properties.siteConfig.appSettings
            
            // Count settings with DOCKER_REGISTRY_SERVER_URL - should only be one
            const dockerUrlSettings = appSettings.filter((s: any) => s.name === 'DOCKER_REGISTRY_SERVER_URL')
            expect(dockerUrlSettings.length).to.equal(1)
            expect(dockerUrlSettings[0].value).to.equal('https://custom-registry.io')
        })

        it('deploys alerts after template deployment', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('container_image_name', new BakeVariable('myimage:v1'))
            params.set('container_registry_url', new BakeVariable('https://registry.io'))
            params.set('container_registry_user', new BakeVariable('admin'))
            params.set('container_registry_password', new BakeVariable('secret'))
            
            const source = new BakeVariable('rg/svc')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'svc' }),
                create_resource_name: sandbox.stub().returns('mywebapp')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let alertsDeployed = false
            let alertTarget: string | null = null
            let alertResourceGroup: string | null = null
            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().callsFake((name, rg, target) => {
                alertsDeployed = true
                alertResourceGroup = rg
                alertTarget = target
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new WebAppContainer('test', ingredient, ctx)
            await plugin.Execute()

            expect(alertsDeployed).to.be.true
            expect(alertResourceGroup).to.equal('test-rg')
            expect(alertTarget).to.equal('mywebapp')
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('container_image_name', new BakeVariable('myimage:v1'))
            params.set('container_registry_url', new BakeVariable('https://registry.io'))
            params.set('container_registry_user', new BakeVariable('admin'))
            params.set('container_registry_password', new BakeVariable('secret'))
            
            const source = new BakeVariable('rg/svc')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'svc' }),
                create_resource_name: sandbox.stub().returns('mywebapp')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('WebApp deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new WebAppContainer('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('WebApp deployment failed')
            }
        })

        it('handles empty tokens map gracefully', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('container_image_name', new BakeVariable('myimage:v1'))
            params.set('container_registry_url', new BakeVariable('https://registry.io'))
            params.set('container_registry_user', new BakeVariable('admin'))
            params.set('container_registry_password', new BakeVariable('secret'))
            
            const source = new BakeVariable('rg/svc')
            const emptyTokens = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params, source, emptyTokens)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'svc' }),
                create_resource_name: sandbox.stub().returns('mywebapp')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new WebAppContainer('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
        })

        it('handles null tokens gracefully', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('container_image_name', new BakeVariable('myimage:v1'))
            params.set('container_registry_url', new BakeVariable('https://registry.io'))
            params.set('container_registry_user', new BakeVariable('admin'))
            params.set('container_registry_password', new BakeVariable('secret'))
            
            const source = new BakeVariable('rg/svc')
            // Create ingredient without tokens (undefined)
            const ingredient: IIngredient = {
                properties: {
                    type: '@azbake/ingredient-webapp-container',
                    source: source,
                    parameters: params,
                    tokens: undefined as any,
                    alerts: new Map()
                },
                dependsOn: [],
                pluginVersion: '0.0.0'
            }
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'svc' }),
                create_resource_name: sandbox.stub().returns('mywebapp')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new WebAppContainer('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
        })

        it('deploys to correct resource group', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('container_image_name', new BakeVariable('myimage:v1'))
            params.set('container_registry_url', new BakeVariable('https://registry.io'))
            params.set('container_registry_user', new BakeVariable('admin'))
            params.set('container_registry_password', new BakeVariable('secret'))
            
            const source = new BakeVariable('rg/svc')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('webapp-resource-group'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'rg', resource: 'svc' }),
                create_resource_name: sandbox.stub().returns('mywebapp')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedResourceGroup: string | null = null
            const mockDeployTemplate = sandbox.stub().callsFake((name, template, params, rg) => {
                deployedResourceGroup = rg
                return Promise.resolve({})
            })
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                DeployAlerts: mockDeployAlerts
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new WebAppContainer('test', ingredient, ctx)
            await plugin.Execute()

            expect(deployedResourceGroup).to.equal('webapp-resource-group')
        })
    })
})
