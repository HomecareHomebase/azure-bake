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

import { NetworkInterface } from '../src/plugin'
import { NetworkInterfaceUtils } from '../src/functions'

// Require the index module to verify exports (CommonJS)
const networkInterfaceIndex = require('../src/index')

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
            type: '@azbake/ingredient-network-interface',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('NetworkInterface Plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys network interface using ARM template', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                networkInterfaceName: { value: 'test-nic' },
                location: { value: 'eastus' }
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const params = new Map<string, BakeVariable>([
                ['networkInterfaceName', new BakeVariable('test-nic')],
                ['location', new BakeVariable('eastus')]
            ])

            const ingredient = createIngredient(params)
            const plugin = new NetworkInterface('network-interface', ingredient, ctx)

            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployTemplate.calledWith('network-interface', sinon.match.any, sinon.match.object, 'test-rg')).to.be.true
        })

        it('throws error on deployment failure', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().rejects(new Error('ARM deployment failed'))
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const plugin = new NetworkInterface('network-interface', ingredient, ctx)

            try {
                await plugin.Execute()
                expect.fail('Should have thrown an error')
            } catch (error: any) {
                expect(error.message).to.equal('ARM deployment failed')
            }
        })

        it('logs source from ingredient properties', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const params = new Map<string, BakeVariable>()
            const source = new BakeVariable('./arm-templates')
            const ingredient = createIngredient(params, source)
            const plugin = new NetworkInterface('network-interface', ingredient, ctx)

            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.true
        })

        it('handles parameters conversion correctly', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('production-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                networkInterfaceName: { value: 'prod-nic-01' },
                location: { value: 'westus2' },
                subnetId: { value: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet' },
                enableIPForwarding: { value: false }
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const params = new Map<string, BakeVariable>([
                ['networkInterfaceName', new BakeVariable('prod-nic-01')],
                ['location', new BakeVariable('westus2')],
                ['subnetId', new BakeVariable('/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet')],
                ['enableIPForwarding', new BakeVariable('false')]
            ])

            const ingredient = createIngredient(params)
            const plugin = new NetworkInterface('network-interface', ingredient, ctx)

            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.calledWith('network-interface', params)).to.be.true
        })
    })
})

describe('ingredient-network-interface index exports', () => {
    it('exports plugin', () => {
        expect(networkInterfaceIndex.plugin).to.equal(NetworkInterface)
    })

    it('exports pluginNS', () => {
        expect(networkInterfaceIndex.pluginNS).to.equal('@azbake/ingredient-network-interface')
    })

    it('exports functions', () => {
        expect(networkInterfaceIndex.functions).to.equal(NetworkInterfaceUtils)
    })

    it('exports functionsNS', () => {
        expect(networkInterfaceIndex.functionsNS).to.equal('networkinterfaceutility')
    })

    it('plugin can be constructed from export', () => {
        const ctx = createContext()
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)

        const Plugin = networkInterfaceIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.be.instanceOf(NetworkInterface)
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = networkInterfaceIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.be.instanceOf(NetworkInterfaceUtils)
    })
})
