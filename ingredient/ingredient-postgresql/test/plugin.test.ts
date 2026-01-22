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
    Logger,
    BakeVariable,
    IngredientManager
} from '@azbake/core'
import { ARMHelper } from '@azbake/arm-helper'

import { PostgreSQLDB } from '../src/plugin'
import { PostgreSQLDBUtils } from '../src/functions'

// Require the index module to verify exports (CommonJS)
const postgresIndex = require('../src/index')

function createContext(region?: IBakeRegion): DeploymentContext {
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
    return new DeploymentContext(auth, pkg, testRegion, new Logger())
}

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-postgresql',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-postgresql index exports', () => {
    it('exports plugin', () => {
        expect(postgresIndex.plugin).to.not.be.undefined
        expect(typeof postgresIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(postgresIndex.pluginNS).to.equal('@azbake/ingredient-postgresql')
    })

    it('exports functions', () => {
        expect(postgresIndex.functions).to.not.be.undefined
        expect(typeof postgresIndex.functions).to.equal('function')
    })

    it('exports functionsNS', () => {
        expect(postgresIndex.functionsNS).to.equal('postgresqldbutils')
    })

    it('plugin can be constructed from export', () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)

        const Plugin = postgresIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })
})

describe('PostgreSQLDB plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    it('constructs with ARMHelper and functions', () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)

        const plugin = new PostgreSQLDB('test', ingredient, ctx)

        expect(plugin).to.not.be.undefined
        expect(plugin._helper).to.be.instanceOf(ARMHelper)
        expect(plugin._functions).to.be.instanceOf(PostgreSQLDBUtils)
    })

    it('throws error on invalid access parameter', async () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>([
            ['serverName', new BakeVariable('testserver')],
            ['administratorLogin', new BakeVariable('admin')],
            ['administratorLoginPassword', new BakeVariable('password123')],
            ['access', new BakeVariable('invalid')]
        ])
        const ingredient = createIngredient(params)

        // Mock ARMHelper.BakeParamsToARMParamsAsync
        sandbox.stub(ARMHelper.prototype, 'BakeParamsToARMParamsAsync').resolves({
            serverName: { value: 'testserver' },
            administratorLogin: { value: 'admin' },
            administratorLoginPassword: { value: 'password123' },
            access: { value: 'invalid' }
        })

        const plugin = new PostgreSQLDB('test', ingredient, ctx)

        try {
            await plugin.Execute()
            expect.fail('Should have thrown an error')
        } catch (error: any) {
            expect(error.message).to.include("Parameter 'access' must be set to")
        }
    })

    it('throws error when missing required parameters', async () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>([
            ['access', new BakeVariable('public')]
        ])
        const ingredient = createIngredient(params)

        // Mock ARMHelper.BakeParamsToARMParamsAsync
        sandbox.stub(ARMHelper.prototype, 'BakeParamsToARMParamsAsync').resolves({
            access: { value: 'public' }
        })

        const plugin = new PostgreSQLDB('test', ingredient, ctx)

        try {
            await plugin.Execute()
            expect.fail('Should have thrown an error')
        } catch (error: any) {
            expect(error.message).to.include('serverName, administratorLogin, and administratorLoginPassword must be defined')
        }
    })

    it('throws error for private access without vnet parameters', async () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>([
            ['serverName', new BakeVariable('testserver')],
            ['administratorLogin', new BakeVariable('admin')],
            ['administratorLoginPassword', new BakeVariable('password123')],
            ['access', new BakeVariable('private')]
        ])
        const ingredient = createIngredient(params)

        // Mock ARMHelper.BakeParamsToARMParamsAsync
        sandbox.stub(ARMHelper.prototype, 'BakeParamsToARMParamsAsync').resolves({
            serverName: { value: 'testserver' },
            administratorLogin: { value: 'admin' },
            administratorLoginPassword: { value: 'password123' },
            access: { value: 'private' }
        })

        const plugin = new PostgreSQLDB('test', ingredient, ctx)

        try {
            await plugin.Execute()
            expect.fail('Should have thrown an error')
        } catch (error: any) {
            expect(error.message).to.include('subnetName, virtualNetworkName, and virtualNetworkResourceGroup')
        }
    })

    it('deploys with public access successfully', async () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>([
            ['serverName', new BakeVariable('testserver')],
            ['administratorLogin', new BakeVariable('admin')],
            ['administratorLoginPassword', new BakeVariable('password123')],
            ['access', new BakeVariable('public')]
        ])
        const ingredient = createIngredient(params)

        // Mock ARMHelper.BakeParamsToARMParamsAsync
        sandbox.stub(ARMHelper.prototype, 'BakeParamsToARMParamsAsync').resolves({
            serverName: { value: 'testserver' },
            administratorLogin: { value: 'admin' },
            administratorLoginPassword: { value: 'password123' },
            access: { value: 'public' }
        })

        // Mock DeployTemplate
        const deployStub = sandbox.stub(ARMHelper.prototype, 'DeployTemplate').resolves()

        // Mock IngredientManager.getIngredientFunction
        sandbox.stub(IngredientManager, 'getIngredientFunction').returns({
            resource_group: async () => 'test-rg'
        })

        const plugin = new PostgreSQLDB('test', ingredient, ctx)
        await plugin.Execute()

        expect(deployStub.calledOnce).to.be.true
    })

    it('deploys with private access successfully', async () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>([
            ['serverName', new BakeVariable('testserver')],
            ['administratorLogin', new BakeVariable('admin')],
            ['administratorLoginPassword', new BakeVariable('password123')],
            ['access', new BakeVariable('private')],
            ['virtualNetworkResourceGroup', new BakeVariable('vnet-rg')],
            ['virtualNetworkName', new BakeVariable('test-vnet')],
            ['subnetName', new BakeVariable('test-subnet')]
        ])
        const ingredient = createIngredient(params)

        // Mock ARMHelper.BakeParamsToARMParamsAsync
        sandbox.stub(ARMHelper.prototype, 'BakeParamsToARMParamsAsync').resolves({
            serverName: { value: 'testserver' },
            administratorLogin: { value: 'admin' },
            administratorLoginPassword: { value: 'password123' },
            access: { value: 'private' },
            virtualNetworkResourceGroup: { value: 'vnet-rg' },
            virtualNetworkName: { value: 'test-vnet' },
            subnetName: { value: 'test-subnet' }
        })

        // Mock functions
        sandbox.stub(PostgreSQLDBUtils.prototype, 'get_vnet').resolves({
            id: '/subscriptions/sub/resourceGroups/vnet-rg/providers/Microsoft.Network/virtualNetworks/test-vnet',
            location: 'eastus'
        })

        sandbox.stub(PostgreSQLDBUtils.prototype, 'get_subnet').resolves({
            id: '/subscriptions/sub/resourceGroups/vnet-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet',
            addressPrefix: '10.0.0.0/24'
        })

        sandbox.stub(PostgreSQLDBUtils.prototype, 'get_private_dns_zone').resolves(undefined)
        sandbox.stub(PostgreSQLDBUtils.prototype, 'create_resource_uri').returns('testserver.private.postgres.database.azure.com')

        // Mock DeployTemplate
        const deployStub = sandbox.stub(ARMHelper.prototype, 'DeployTemplate').resolves()

        // Mock IngredientManager.getIngredientFunction
        sandbox.stub(IngredientManager, 'getIngredientFunction').returns({
            resource_group: async () => 'test-rg'
        })

        const plugin = new PostgreSQLDB('test', ingredient, ctx)
        await plugin.Execute()

        expect(deployStub.calledOnce).to.be.true
    })

    it('handles existing private DNS zone', async () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>([
            ['serverName', new BakeVariable('testserver')],
            ['administratorLogin', new BakeVariable('admin')],
            ['administratorLoginPassword', new BakeVariable('password123')],
            ['access', new BakeVariable('private')],
            ['virtualNetworkResourceGroup', new BakeVariable('vnet-rg')],
            ['virtualNetworkName', new BakeVariable('test-vnet')],
            ['subnetName', new BakeVariable('test-subnet')]
        ])
        const ingredient = createIngredient(params)

        // Mock ARMHelper.BakeParamsToARMParamsAsync
        sandbox.stub(ARMHelper.prototype, 'BakeParamsToARMParamsAsync').resolves({
            serverName: { value: 'testserver' },
            administratorLogin: { value: 'admin' },
            administratorLoginPassword: { value: 'password123' },
            access: { value: 'private' },
            virtualNetworkResourceGroup: { value: 'vnet-rg' },
            virtualNetworkName: { value: 'test-vnet' },
            subnetName: { value: 'test-subnet' }
        })

        // Mock functions
        sandbox.stub(PostgreSQLDBUtils.prototype, 'get_vnet').resolves({
            id: '/subscriptions/sub/resourceGroups/vnet-rg/providers/Microsoft.Network/virtualNetworks/test-vnet',
            location: 'eastus'
        })

        sandbox.stub(PostgreSQLDBUtils.prototype, 'get_subnet').resolves({
            id: '/subscriptions/sub/resourceGroups/vnet-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet',
            addressPrefix: '10.0.0.0/24'
        })

        // Return existing DNS zone
        sandbox.stub(PostgreSQLDBUtils.prototype, 'get_private_dns_zone').resolves({
            id: '/subscriptions/sub/resourceGroups/vnet-rg/providers/Microsoft.Network/privateDnsZones/test.private.postgres.database.azure.com'
        })
        sandbox.stub(PostgreSQLDBUtils.prototype, 'create_resource_uri').returns('testserver.private.postgres.database.azure.com')

        // Mock DeployTemplate
        const deployStub = sandbox.stub(ARMHelper.prototype, 'DeployTemplate').resolves()

        // Mock IngredientManager.getIngredientFunction
        sandbox.stub(IngredientManager, 'getIngredientFunction').returns({
            resource_group: async () => 'test-rg'
        })

        const plugin = new PostgreSQLDB('test', ingredient, ctx)
        await plugin.Execute()

        expect(deployStub.calledOnce).to.be.true
    })

    it('adds empty firewallRules if not provided', async () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>([
            ['serverName', new BakeVariable('testserver')],
            ['administratorLogin', new BakeVariable('admin')],
            ['administratorLoginPassword', new BakeVariable('password123')],
            ['access', new BakeVariable('public')]
        ])
        const ingredient = createIngredient(params)

        const mockParams = {
            serverName: { value: 'testserver' },
            administratorLogin: { value: 'admin' },
            administratorLoginPassword: { value: 'password123' },
            access: { value: 'public' }
        }

        // Mock ARMHelper.BakeParamsToARMParamsAsync
        sandbox.stub(ARMHelper.prototype, 'BakeParamsToARMParamsAsync').resolves(mockParams)

        // Mock DeployTemplate to capture the params
        const deployStub = sandbox.stub(ARMHelper.prototype, 'DeployTemplate').resolves()

        // Mock IngredientManager.getIngredientFunction
        sandbox.stub(IngredientManager, 'getIngredientFunction').returns({
            resource_group: async () => 'test-rg'
        })

        const plugin = new PostgreSQLDB('test', ingredient, ctx)
        await plugin.Execute()

        // Check that firewallRules was added
        expect((mockParams as any).firewallRules).to.deep.equal({ value: { rules: [] } })
    })

    it('handles deployment failure gracefully', async () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>([
            ['serverName', new BakeVariable('testserver')],
            ['administratorLogin', new BakeVariable('admin')],
            ['administratorLoginPassword', new BakeVariable('password123')],
            ['access', new BakeVariable('public')]
        ])
        const ingredient = createIngredient(params)

        // Mock ARMHelper.BakeParamsToARMParamsAsync
        sandbox.stub(ARMHelper.prototype, 'BakeParamsToARMParamsAsync').resolves({
            serverName: { value: 'testserver' },
            administratorLogin: { value: 'admin' },
            administratorLoginPassword: { value: 'password123' },
            access: { value: 'public' }
        })

        // Mock DeployTemplate to throw
        sandbox.stub(ARMHelper.prototype, 'DeployTemplate').rejects(new Error('Deployment failed'))

        // Mock IngredientManager.getIngredientFunction
        sandbox.stub(IngredientManager, 'getIngredientFunction').returns({
            resource_group: async () => 'test-rg'
        })

        const plugin = new PostgreSQLDB('test', ingredient, ctx)

        try {
            await plugin.Execute()
            expect.fail('Should have thrown an error')
        } catch (error: any) {
            expect(error.message).to.equal('Deployment failed')
        }
    })
})

describe('VnetData class', () => {
    it('can be imported from module', () => {
        const { VnetData, Value, Network } = require('../src/vnetData')
        
        const vnetData = new VnetData()
        expect(vnetData).to.not.be.undefined
        
        const value = new Value()
        expect(value).to.not.be.undefined
        
        const network = new Network()
        expect(network).to.not.be.undefined
    })
})
