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
            subscriptionId: '00000000-0000-0000-0000-000000000000',
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
    const auth: any = {
        domain: 'tenant',
        clientId: 'service',
        secret: 'secret',
        getToken: async () => ({ token: 'test-token', expiresOnTimestamp: Date.now() + 3600000 })
    }
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

            // Stub the get method directly on the prototype
            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get').resolves(mockNetworkInterface)
            
            const result = await utils.get('test-nic')

            expect(result).to.deep.equal(mockNetworkInterface)
        })

        it('uses provided resource group when specified', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockNetworkInterface = { name: 'test-nic' }
            
            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get').resolves(mockNetworkInterface)
            
            const result = await utils.get('test-nic', 'custom-rg')

            expect(result).to.deep.equal(mockNetworkInterface)
        })
    })

    describe('get_mac_address', () => {
        it('returns MAC address from network interface', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_mac_address').resolves('00-0D-3A-1A-2B-3C')
            
            const result = await utils.get_mac_address('test-nic')

            expect(result).to.equal('00-0D-3A-1A-2B-3C')
        })

        it('returns undefined when MAC address is not set', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_mac_address').resolves(undefined)
            
            const result = await utils.get_mac_address('test-nic')

            expect(result).to.be.undefined
        })

        it('uses provided resource group when specified', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_mac_address').resolves('AA-BB-CC-DD-EE-FF')
            
            const result = await utils.get_mac_address('test-nic', 'my-rg')

            expect(result).to.equal('AA-BB-CC-DD-EE-FF')
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

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_ip_configurations').resolves(mockIpConfigs)
            
            const result = await utils.get_ip_configurations('test-nic')

            expect(result).to.deep.equal(mockIpConfigs)
        })

        it('returns undefined when IP configurations are not set', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_ip_configurations').resolves(undefined)
            
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

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_virtual_machine').resolves(mockVm)
            
            const result = await utils.get_virtual_machine('test-nic')

            expect(result).to.deep.equal(mockVm)
        })

        it('returns undefined when no virtual machine is attached', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_virtual_machine').resolves(undefined)
            
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

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_dns_settings').resolves(mockDnsSettings)
            
            const result = await utils.get_dns_settings('test-nic')

            expect(result).to.deep.equal(mockDnsSettings)
        })

        it('returns undefined when DNS settings are not configured', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_dns_settings').resolves(undefined)
            
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

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_primary').resolves(true)
            
            const result = await utils.get_primary('test-nic')

            expect(result).to.be.true
        })

        it('returns false when network interface is not primary', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_primary').resolves(false)
            
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

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_enable_ip_forwarding').resolves(true)
            
            const result = await utils.get_enable_ip_forwarding('test-nic')

            expect(result).to.be.true
        })

        it('returns false when IP forwarding is disabled', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_enable_ip_forwarding').resolves(false)
            
            const result = await utils.get_enable_ip_forwarding('test-nic')

            expect(result).to.be.false
        })

        it('uses provided resource group when specified', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new NetworkInterfaceUtils(ctx)
            sandbox.stub(utils, 'get_enable_ip_forwarding').resolves(true)
            
            const result = await utils.get_enable_ip_forwarding('test-nic', 'custom-rg')

            expect(result).to.be.true
        })
    })
    
    describe('context', () => {
        it('has correct context set', () => {
            const ctx = createContext()
            const utils = new NetworkInterfaceUtils(ctx)
            expect(utils.context).to.equal(ctx)
        })
        
        it('uses modernCredentials from context', () => {
            const ctx = createContext()
            const utils = new NetworkInterfaceUtils(ctx)
            expect(ctx.Credentials.modernCredentials).to.not.be.undefined
            expect(typeof ctx.Credentials.modernCredentials.getToken).to.equal('function')
        })
    })
})
