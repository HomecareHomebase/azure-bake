import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import {
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IngredientManager,
    Logger
} from '@azbake/core'

import { NetworkInterfaceUtils } from '../src/functions'

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

describe('NetworkInterfaceUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates network interface resource name using coreutils with default shortName', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobnitst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devglobnitst')
            expect(mockUtils.create_resource_name.calledWith('ni', null, false)).to.be.true
        })

        it('creates network interface resource name with custom shortName', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobnicustom')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = utils.create_resource_name('custom')

            expect(result).to.equal('devglobnicustom')
            expect(mockUtils.create_resource_name.calledWith('ni', 'custom', false)).to.be.true
        })
    })

    describe('get', () => {
        it('returns network interface from Azure', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkInterface = {
                id: '/subscriptions/sub/resourceGroups/test-rg/providers/Microsoft.Network/networkInterfaces/test-nic',
                name: 'test-nic',
                location: 'eastus',
                macAddress: '00-0D-3A-1A-2B-3C'
            }

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves(mockNetworkInterface)
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get('test-nic')

            expect(result).to.deep.equal(mockNetworkInterface)
            expect(mockNetworkClient.networkInterfaces.get.calledWith('test-rg', 'test-nic')).to.be.true
        })

        it('uses provided resource group when specified', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({ name: 'test-nic' })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            await utils.get('test-nic', 'custom-rg')

            expect(mockNetworkClient.networkInterfaces.get.calledWith('custom-rg', 'test-nic')).to.be.true
        })
    })

    describe('get_mac_address', () => {
        it('returns MAC address from network interface', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        macAddress: '00-0D-3A-1A-2B-3C'
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_mac_address('test-nic')

            expect(result).to.equal('00-0D-3A-1A-2B-3C')
        })

        it('returns undefined when MAC address is not set', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        macAddress: undefined
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_mac_address('test-nic')

            expect(result).to.be.undefined
        })

        it('uses provided resource group when specified', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({ macAddress: 'AA-BB-CC-DD-EE-FF' })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            await utils.get_mac_address('test-nic', 'my-rg')

            expect(mockNetworkClient.networkInterfaces.get.calledWith('my-rg', 'test-nic')).to.be.true
        })
    })

    describe('get_ip_configurations', () => {
        it('returns IP configurations from network interface', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockIpConfigs = [
                { name: 'ipconfig1', privateIPAddress: '10.0.0.4' },
                { name: 'ipconfig2', privateIPAddress: '10.0.0.5' }
            ]

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        ipConfigurations: mockIpConfigs
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_ip_configurations('test-nic')

            expect(result).to.deep.equal(mockIpConfigs)
        })

        it('returns undefined when IP configurations are not set', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        ipConfigurations: undefined
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_ip_configurations('test-nic')

            expect(result).to.be.undefined
        })
    })

    describe('get_virtual_machine', () => {
        it('returns virtual machine reference from network interface', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockVm = {
                id: '/subscriptions/sub/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/test-vm'
            }

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        virtualMachine: mockVm
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_virtual_machine('test-nic')

            expect(result).to.deep.equal(mockVm)
        })

        it('returns undefined when no virtual machine is attached', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        virtualMachine: undefined
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_virtual_machine('test-nic')

            expect(result).to.be.undefined
        })
    })

    describe('get_dns_settings', () => {
        it('returns DNS settings from network interface', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDnsSettings = {
                dnsServers: ['10.0.0.1', '10.0.0.2'],
                appliedDnsServers: ['10.0.0.1'],
                internalDomainNameSuffix: 'test.internal'
            }

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        dnsSettings: mockDnsSettings
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_dns_settings('test-nic')

            expect(result).to.deep.equal(mockDnsSettings)
        })

        it('returns undefined when DNS settings are not configured', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        dnsSettings: undefined
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_dns_settings('test-nic')

            expect(result).to.be.undefined
        })
    })

    describe('get_primary', () => {
        it('returns true when network interface is primary', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        primary: true
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_primary('test-nic')

            expect(result).to.be.true
        })

        it('returns false when network interface is not primary', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        primary: false
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_primary('test-nic')

            expect(result).to.be.false
        })
    })

    describe('get_enable_ip_forwarding', () => {
        it('returns true when IP forwarding is enabled', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        enableIPForwarding: true
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_enable_ip_forwarding('test-nic')

            expect(result).to.be.true
        })

        it('returns false when IP forwarding is disabled', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({
                        name: 'test-nic',
                        enableIPForwarding: false
                    })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            const result = await utils.get_enable_ip_forwarding('test-nic')

            expect(result).to.be.false
        })

        it('uses provided resource group when specified', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkClient = {
                networkInterfaces: {
                    get: sandbox.stub().resolves({ enableIPForwarding: true })
                }
            }

            const armNetwork = require('@azure/arm-network')
            sandbox.stub(armNetwork, 'NetworkManagementClient').returns(mockNetworkClient)

            const utils = new NetworkInterfaceUtils(ctx)
            await utils.get_enable_ip_forwarding('test-nic', 'custom-rg')

            expect(mockNetworkClient.networkInterfaces.get.calledWith('custom-rg', 'test-nic')).to.be.true
        })
    })
})
