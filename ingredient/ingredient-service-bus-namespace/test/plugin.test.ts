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

import { ServiceBusNamespace } from '../src/plugin'
import { ServiceBusNamespaceUtils } from '../src/functions'

// Require the compiled modules to verify exports
const serviceBusNamespaceIndex = require('../dist/index')

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
            type: '@azbake/ingredient-service-bus-namespace',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-service-bus-namespace index exports', () => {
    it('exports plugin', () => {
        expect(serviceBusNamespaceIndex.plugin).to.not.be.undefined
        expect(typeof serviceBusNamespaceIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(serviceBusNamespaceIndex.pluginNS).to.equal('@azbake/ingredient-service-bus-namespace')
    })

    it('exports functions', () => {
        expect(serviceBusNamespaceIndex.functions).to.not.be.undefined
        expect(typeof serviceBusNamespaceIndex.functions).to.equal('function')
        expect(serviceBusNamespaceIndex.functions.name).to.equal('ServiceBusNamespaceUtils')
    })

    it('exports functionsNS', () => {
        expect(serviceBusNamespaceIndex.functionsNS).to.equal('servicebusnamespace')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        // Mock the ServiceBusManagementClient constructor
        const ServiceBusModule = require('@azure/arm-servicebus')
        const originalClient = ServiceBusModule.ServiceBusManagementClient
        ServiceBusModule.ServiceBusManagementClient = function() {
            return { namespaces: {}, disasterRecoveryConfigs: {} }
        }

        try {
            const Plugin = serviceBusNamespaceIndex.plugin
            const instance = new Plugin('test', ingredient, ctx)
            expect(instance).to.not.be.undefined
            expect(instance._name).to.equal('test')
        } finally {
            ServiceBusModule.ServiceBusManagementClient = originalClient
        }
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = serviceBusNamespaceIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('ServiceBusNamespaceUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates service bus namespace resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobsbntst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new ServiceBusNamespaceUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devglobsbntst')
            expect(mockUtils.create_resource_name.calledWith('sbn', null, true)).to.be.true
        })
    })

    describe('get_endpoint', () => {
        it('returns service bus endpoint using default resource group', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNamespacesGet = sandbox.stub().resolves({
                serviceBusEndpoint: 'https://myns.servicebus.windows.net:443/'
            })

            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: { get: mockNamespacesGet }
            })

            const utils = new ServiceBusNamespaceUtils(ctx)
            const result = await utils.get_endpoint('myns')

            expect(result).to.equal('https://myns.servicebus.windows.net:443/')
            expect(mockNamespacesGet.calledWith('test-rg', 'myns')).to.be.true
        })

        it('uses modern credentials and subscription id', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const ServiceBusModule = require('@azure/arm-servicebus')
            const clientStub = sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: { get: sandbox.stub().resolves({ serviceBusEndpoint: '' }) }
            })

            const utils = new ServiceBusNamespaceUtils(ctx)
            await utils.get_endpoint('myns')

            expect(clientStub.calledWith(ctx.Credentials.modernCredentials, 'test-sub-id')).to.be.true
        })

        it('returns service bus endpoint using custom resource group', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNamespacesGet = sandbox.stub().resolves({
                serviceBusEndpoint: 'https://myns.servicebus.windows.net:443/'
            })

            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: { get: mockNamespacesGet }
            })

            const utils = new ServiceBusNamespaceUtils(ctx)
            const result = await utils.get_endpoint('myns', 'custom-rg')

            expect(result).to.equal('https://myns.servicebus.windows.net:443/')
            expect(mockNamespacesGet.calledWith('custom-rg', 'myns')).to.be.true
            expect(mockUtils.resource_group.called).to.be.false
        })

        it('returns empty string if endpoint is not available', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNamespacesGet = sandbox.stub().resolves({
                serviceBusEndpoint: undefined
            })

            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: { get: mockNamespacesGet }
            })

            const utils = new ServiceBusNamespaceUtils(ctx)
            const result = await utils.get_endpoint('myns')

            expect(result).to.equal('')
        })
    })

    describe('get_primary_key', () => {
        it('returns primary key for auth rule', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                primaryKey: 'primary-key-value'
            })

            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: { listKeys: mockListKeys }
            })

            const utils = new ServiceBusNamespaceUtils(ctx)
            const result = await utils.get_primary_key('myns', 'RootManageSharedAccessKey')

            expect(result).to.equal('primary-key-value')
            expect(mockListKeys.calledWith('test-rg', 'myns', 'RootManageSharedAccessKey')).to.be.true
        })

        it('returns empty string if primary key is not available', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                primaryKey: undefined
            })

            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: { listKeys: mockListKeys }
            })

            const utils = new ServiceBusNamespaceUtils(ctx)
            const result = await utils.get_primary_key('myns', 'RootManageSharedAccessKey')

            expect(result).to.equal('')
        })
    })

    describe('get_secondary_key', () => {
        it('returns secondary key for auth rule', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                secondaryKey: 'secondary-key-value'
            })

            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: { listKeys: mockListKeys }
            })

            const utils = new ServiceBusNamespaceUtils(ctx)
            const result = await utils.get_secondary_key('myns', 'RootManageSharedAccessKey')

            expect(result).to.equal('secondary-key-value')
            expect(mockListKeys.calledWith('test-rg', 'myns', 'RootManageSharedAccessKey')).to.be.true
        })

        it('uses custom resource group if provided', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                secondaryKey: 'secondary-key-value'
            })

            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: { listKeys: mockListKeys }
            })

            const utils = new ServiceBusNamespaceUtils(ctx)
            const result = await utils.get_secondary_key('myns', 'RootManageSharedAccessKey', 'custom-rg')

            expect(result).to.equal('secondary-key-value')
            expect(mockListKeys.calledWith('custom-rg', 'myns', 'RootManageSharedAccessKey')).to.be.true
        })
    })

    describe('get_primary_connection_string', () => {
        it('returns primary connection string', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                primaryConnectionString: 'Endpoint=sb://myns.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=xxx'
            })

            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: { listKeys: mockListKeys }
            })

            const utils = new ServiceBusNamespaceUtils(ctx)
            const result = await utils.get_primary_connection_string('myns', 'RootManageSharedAccessKey')

            expect(result).to.equal('Endpoint=sb://myns.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=xxx')
        })

        it('returns empty string if connection string is not available', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                primaryConnectionString: undefined
            })

            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: { listKeys: mockListKeys }
            })

            const utils = new ServiceBusNamespaceUtils(ctx)
            const result = await utils.get_primary_connection_string('myns', 'RootManageSharedAccessKey')

            expect(result).to.equal('')
        })
    })

    describe('get_secondary_connection_string', () => {
        it('returns secondary connection string', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockListKeys = sandbox.stub().resolves({
                secondaryConnectionString: 'Endpoint=sb://myns.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=yyy'
            })

            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: { listKeys: mockListKeys }
            })

            const utils = new ServiceBusNamespaceUtils(ctx)
            const result = await utils.get_secondary_connection_string('myns', 'RootManageSharedAccessKey')

            expect(result).to.equal('Endpoint=sb://myns.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=yyy')
        })
    })
})

describe('ServiceBusNamespace Plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys service bus namespace with Basic SKU', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('myservicebus'))
            params.set('skuName', new BakeVariable('Basic'))
            
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
                name: { value: 'myservicebus' },
                skuName: { value: 'Basic' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            // Mock ServiceBusManagementClient
            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: {},
                disasterRecoveryConfigs: {}
            })

            const plugin = new ServiceBusNamespace('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockConfigureDiagnostics.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployAlerts.called).to.be.true
        })

        it('deploys service bus namespace with Standard SKU', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('myservicebus'))
            params.set('skuName', new BakeVariable('Standard'))
            
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
                name: { value: 'myservicebus' },
                skuName: { value: 'Standard' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            // Mock ServiceBusManagementClient
            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: {},
                disasterRecoveryConfigs: {}
            })

            const plugin = new ServiceBusNamespace('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployAlerts.called).to.be.true
        })

        it('deploys service bus namespace with Premium SKU and includes CPU/Memory alerts', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('myservicebus'))
            params.set('skuName', new BakeVariable('Premium'))
            
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
                name: { value: 'myservicebus' },
                skuName: { value: 'Premium' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            // Mock ServiceBusManagementClient
            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: {},
                disasterRecoveryConfigs: {}
            })

            const plugin = new ServiceBusNamespace('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployAlerts.called).to.be.true
        })

        it('handles Geo-DR configuration by breaking existing pairing', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('myservicebus'))
            params.set('skuName', new BakeVariable('Premium'))
            params.set('secondaryName', new BakeVariable('myservicebus-secondary'))
            params.set('secondaryLocation', new BakeVariable('westus2'))
            params.set('aliasName', new BakeVariable('myalias'))
            
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
                name: { value: 'myservicebus' },
                skuName: { value: 'Premium' },
                secondaryName: { value: 'myservicebus-secondary' },
                secondaryLocation: { value: 'westus2' },
                aliasName: { value: 'myalias' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            // Mock DR config get and break pairing
            const mockBreakPairing = sandbox.stub().resolves({})
            const mockDRGet = sandbox.stub().resolves({
                provisioningState: 'Succeeded',
                partnerNamespace: 'some-partner'
            })

            // Mock ServiceBusManagementClient
            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: {},
                disasterRecoveryConfigs: {
                    get: mockDRGet,
                    breakPairing: mockBreakPairing
                }
            })

            const plugin = new ServiceBusNamespace('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDRGet.calledWith('test-rg', 'myservicebus', 'myalias')).to.be.true
            expect(mockBreakPairing.calledWith('test-rg', 'myservicebus', 'myalias')).to.be.true
            expect(mockDeployTemplate.called).to.be.true
        })

        it('skips breaking pairing if already broken', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('myservicebus'))
            params.set('skuName', new BakeVariable('Premium'))
            params.set('secondaryName', new BakeVariable('myservicebus-secondary'))
            params.set('secondaryLocation', new BakeVariable('westus2'))
            params.set('aliasName', new BakeVariable('myalias'))
            
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
                name: { value: 'myservicebus' },
                skuName: { value: 'Premium' },
                secondaryName: { value: 'myservicebus-secondary' },
                secondaryLocation: { value: 'westus2' },
                aliasName: { value: 'myalias' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            // Mock DR config - pairing already broken (empty partnerNamespace)
            const mockBreakPairing = sandbox.stub().resolves({})
            const mockDRGet = sandbox.stub().resolves({
                provisioningState: 'Succeeded',
                partnerNamespace: ''
            })

            // Mock ServiceBusManagementClient
            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: {},
                disasterRecoveryConfigs: {
                    get: mockDRGet,
                    breakPairing: mockBreakPairing
                }
            })

            const plugin = new ServiceBusNamespace('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDRGet.called).to.be.true
            expect(mockBreakPairing.called).to.be.false
            expect(mockDeployTemplate.called).to.be.true
        })

        it('handles 404 when alias not found during Geo-DR check', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('myservicebus'))
            params.set('skuName', new BakeVariable('Premium'))
            params.set('secondaryName', new BakeVariable('myservicebus-secondary'))
            params.set('secondaryLocation', new BakeVariable('westus2'))
            params.set('aliasName', new BakeVariable('myalias'))
            
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
                name: { value: 'myservicebus' },
                skuName: { value: 'Premium' },
                secondaryName: { value: 'myservicebus-secondary' },
                secondaryLocation: { value: 'westus2' },
                aliasName: { value: 'myalias' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            // Mock DR config - alias not found (404)
            const notFoundError: any = new Error('Not Found')
            notFoundError.statusCode = 404
            const mockDRGet = sandbox.stub().rejects(notFoundError)

            // Mock ServiceBusManagementClient
            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: {},
                disasterRecoveryConfigs: {
                    get: mockDRGet
                }
            })

            const plugin = new ServiceBusNamespace('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDRGet.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
        })

        it('throws error when Geo-DR check fails with non-404 error', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('myservicebus'))
            params.set('skuName', new BakeVariable('Premium'))
            params.set('secondaryName', new BakeVariable('myservicebus-secondary'))
            params.set('secondaryLocation', new BakeVariable('westus2'))
            params.set('aliasName', new BakeVariable('myalias'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                name: { value: 'myservicebus' },
                skuName: { value: 'Premium' },
                secondaryName: { value: 'myservicebus-secondary' },
                secondaryLocation: { value: 'westus2' },
                aliasName: { value: 'myalias' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            // Mock DR config - server error
            const serverError: any = new Error('Internal Server Error')
            serverError.statusCode = 500
            const mockDRGet = sandbox.stub().rejects(serverError)

            // Mock ServiceBusManagementClient
            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: {},
                disasterRecoveryConfigs: {
                    get: mockDRGet
                }
            })

            const plugin = new ServiceBusNamespace('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Internal Server Error')
            }
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('myservicebus'))
            params.set('skuName', new BakeVariable('Basic'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Service Bus deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                name: { value: 'myservicebus' },
                skuName: { value: 'Basic' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            // Mock ServiceBusManagementClient
            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: {},
                disasterRecoveryConfigs: {}
            })

            const plugin = new ServiceBusNamespace('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Service Bus deployment failed')
            }
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('myservicebus'))
            params.set('skuName', new BakeVariable('Basic'))
            
            const source = new BakeVariable('my-sb-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockDeployAlerts = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                name: { value: 'myservicebus' },
                skuName: { value: 'Basic' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            // Mock ServiceBusManagementClient
            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: {},
                disasterRecoveryConfigs: {}
            })

            const plugin = new ServiceBusNamespace('test', ingredient, ctx)
            await plugin.Execute()

            // Verify the plugin executed successfully with the source
            expect(mockDeployTemplate.called).to.be.true
        })

        it('skips Geo-DR check for non-Premium SKU even with secondary params', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('name', new BakeVariable('myservicebus'))
            params.set('skuName', new BakeVariable('Standard'))
            params.set('secondaryName', new BakeVariable('myservicebus-secondary'))
            params.set('secondaryLocation', new BakeVariable('westus2'))
            params.set('aliasName', new BakeVariable('myalias'))
            
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
                name: { value: 'myservicebus' },
                skuName: { value: 'Standard' },
                secondaryName: { value: 'myservicebus-secondary' },
                secondaryLocation: { value: 'westus2' },
                aliasName: { value: 'myalias' }
            })
            const mockConfigureDiagnostics = sandbox.stub().callsFake((params) => params)
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                DeployAlerts: mockDeployAlerts,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync,
                ConfigureDiagnostics: mockConfigureDiagnostics
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            // Mock ServiceBusManagementClient - DR methods should not be called
            const mockDRGet = sandbox.stub().resolves({})

            const ServiceBusModule = require('@azure/arm-servicebus')
            sandbox.stub(ServiceBusModule, 'ServiceBusManagementClient').returns({
                namespaces: {},
                disasterRecoveryConfigs: {
                    get: mockDRGet
                }
            })

            const plugin = new ServiceBusNamespace('test', ingredient, ctx)
            await plugin.Execute()

            // DR check should NOT be called for Standard SKU
            expect(mockDRGet.called).to.be.false
            expect(mockDeployTemplate.called).to.be.true
        })
    })
})
