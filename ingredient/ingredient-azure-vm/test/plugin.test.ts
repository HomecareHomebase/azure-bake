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

import { AzureVm } from '../src/plugin'
import { AzureVmUtils } from '../src/functions'

// Require the compiled modules to verify exports
const azureVmIndex = require('../dist/index')

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
        regions: [{ name: 'East US', shortName: 'eus', code: 'eus1' }],
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

    const testRegion: IBakeRegion = region || { name: 'East US', shortName: 'eus', code: 'eus1' }
    const auth: any = { domain: 'tenant', clientId: 'service', secret: 'secret' }
    return new DeploymentContext(auth, pkg, testRegion, new Logger(), ingredient)
}

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-azure-vm',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-azure-vm index exports', () => {
    it('exports plugin', () => {
        expect(azureVmIndex.plugin).to.not.be.undefined
        expect(typeof azureVmIndex.plugin).to.equal('function')
        expect(azureVmIndex.plugin.name).to.equal('AzureVm')
    })

    it('exports pluginNS', () => {
        expect(azureVmIndex.pluginNS).to.equal('@azbake/ingredient-azure-vm')
    })

    it('exports functions', () => {
        expect(azureVmIndex.functions).to.not.be.undefined
        expect(typeof azureVmIndex.functions).to.equal('function')
        expect(azureVmIndex.functions.name).to.equal('AzureVmUtils')
    })

    it('exports functionsNS', () => {
        expect(azureVmIndex.functionsNS).to.equal('vm')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        params.set('osType', new BakeVariable('Linux'))
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = azureVmIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = azureVmIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('AzureVmUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates VM resource name using coreutils without region', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devvmtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AzureVmUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devvmtst')
            expect(mockUtils.create_resource_name.calledWith('vm', null, false)).to.be.true
        })

        it('creates VM resource name with custom shortName', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devvmmyserver')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AzureVmUtils(ctx)
            const result = utils.create_resource_name('myserver')

            expect(result).to.equal('devvmmyserver')
            expect(mockUtils.create_resource_name.calledWith('vm', 'myserver', false)).to.be.true
        })

        it('passes undefined shortName as null to coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devvmtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AzureVmUtils(ctx)
            utils.create_resource_name(undefined)

            expect(mockUtils.create_resource_name.calledWith('vm', null, false)).to.be.true
        })

        it('uses false for useRegionCode to keep VM names short', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('prodvmwebserver')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AzureVmUtils(ctx)
            utils.create_resource_name('webserver')

            // VM names have a 15 char limit, so region code is not used
            expect(mockUtils.create_resource_name.firstCall.args[2]).to.equal(false)
        })
    })
})

describe('AzureVm Plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys Windows VM when osType is windows', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('windows'))
            params.set('vmName', new BakeVariable('my-windows-vm'))
            params.set('adminUsername', new BakeVariable('admin'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let deployedTemplate: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any) => {
                deployedTemplate = template
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                osType: { value: 'windows' },
                vmName: { value: 'my-windows-vm' },
                adminUsername: { value: 'admin' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            const logSpy = sandbox.spy(plugin._logger, 'log')

            await plugin.Execute()

            expect(mockDeployTemplate.calledOnce).to.be.true
            expect(logSpy.calledWith(sinon.match(/Deploying OS Type: windows/))).to.be.true
        })

        it('deploys Windows VM when osType is Windows (case insensitive)', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('Windows'))
            params.set('vmName', new BakeVariable('my-win-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                osType: { value: 'Windows' },
                vmName: { value: 'my-win-vm' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            const logSpy = sandbox.spy(plugin._logger, 'log')

            await plugin.Execute()

            expect(mockDeployTemplate.calledOnce).to.be.true
            expect(logSpy.calledWith(sinon.match(/Deploying OS Type: Windows/))).to.be.true
        })

        it('deploys Linux VM when osType is linux', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('linux'))
            params.set('vmName', new BakeVariable('my-linux-vm'))
            params.set('adminUsername', new BakeVariable('azureuser'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                osType: { value: 'linux' },
                vmName: { value: 'my-linux-vm' },
                adminUsername: { value: 'azureuser' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            const logSpy = sandbox.spy(plugin._logger, 'log')

            await plugin.Execute()

            expect(mockDeployTemplate.calledOnce).to.be.true
            expect(logSpy.calledWith(sinon.match(/Deploying OS Type: linux/))).to.be.true
        })

        it('deploys Linux VM when osType is Linux (case insensitive)', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('Linux'))
            params.set('vmName', new BakeVariable('my-linux-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                osType: { value: 'Linux' },
                vmName: { value: 'my-linux-vm' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            const logSpy = sandbox.spy(plugin._logger, 'log')

            await plugin.Execute()

            expect(mockDeployTemplate.calledOnce).to.be.true
            expect(logSpy.calledWith(sinon.match(/Deploying OS Type: Linux/))).to.be.true
        })

        it('logs error when osType is invalid', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('macos'))
            params.set('vmName', new BakeVariable('my-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                osType: { value: 'macos' },
                vmName: { value: 'my-vm' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            const errorSpy = sandbox.spy(plugin._logger, 'error')

            await plugin.Execute()

            expect(mockDeployTemplate.called).to.be.false
            expect(errorSpy.calledWith('Please specify a valid OS in your recipe. Types are Linux and Windows')).to.be.true
        })

        it('removes osType from params before deployment', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('linux'))
            params.set('vmName', new BakeVariable('my-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                osType: { value: 'linux' },
                vmName: { value: 'my-vm' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedParams).to.not.have.property('osType')
            expect(capturedParams.vmName).to.deep.equal({ value: 'my-vm' })
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('linux'))
            params.set('vmName', new BakeVariable('my-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('VM deployment failed: Quota exceeded')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                osType: { value: 'linux' },
                vmName: { value: 'my-vm' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            const errorSpy = sandbox.spy(plugin._logger, 'error')

            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('VM deployment failed: Quota exceeded')
                expect(errorSpy.calledOnce).to.be.true
                expect(errorSpy.firstCall.args[0]).to.include('deployment failed')
            }
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('linux'))
            params.set('vmName', new BakeVariable('my-vm'))
            
            const source = new BakeVariable('vm-source-config')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                osType: { value: 'linux' },
                vmName: { value: 'my-vm' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            const logSpy = sandbox.spy(plugin._logger, 'log')

            await plugin.Execute()

            const logCalls = logSpy.getCalls()
            const sourceLogCall = logCalls.find(call => 
                call.args[0].includes('Azure VM Plugin Logging')
            )
            expect(sourceLogCall).to.not.be.undefined
        })

        it('passes correct resource group to DeployTemplate', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('windows'))
            params.set('vmName', new BakeVariable('my-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('my-vm-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({
                    osType: { value: 'windows' },
                    vmName: { value: 'my-vm' }
                })
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.firstCall.args[3]).to.equal('my-vm-rg')
        })

        it('uses coreutils from IngredientManager', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('linux'))
            params.set('vmName', new BakeVariable('my-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const getIngredientFunctionStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({
                    osType: { value: 'linux' },
                    vmName: { value: 'my-vm' }
                })
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            await plugin.Execute()

            expect(getIngredientFunctionStub.calledWith('coreutils', ctx)).to.be.true
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('linux'))
            params.set('vmName', new BakeVariable('my-vm'))
            
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
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({
                        osType: { value: 'linux' },
                        vmName: { value: 'my-vm' }
                    })
                }
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedCtx).to.not.be.null
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('handles WINDOWS in any case variation', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('WINDOWS'))
            params.set('vmName', new BakeVariable('my-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                osType: { value: 'WINDOWS' },
                vmName: { value: 'my-vm' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.calledOnce).to.be.true
        })

        it('handles LINUX in any case variation', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('LINUX'))
            params.set('vmName', new BakeVariable('my-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                osType: { value: 'LINUX' },
                vmName: { value: 'my-vm' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.calledOnce).to.be.true
        })

        it('deploys with multiple parameters for a complete VM configuration', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('osType', new BakeVariable('linux'))
            params.set('vmName', new BakeVariable('prod-web-vm'))
            params.set('vmSize', new BakeVariable('Standard_D4s_v3'))
            params.set('adminUsername', new BakeVariable('azureadmin'))
            params.set('sshPublicKey', new BakeVariable('ssh-rsa AAAA...'))
            params.set('vnetName', new BakeVariable('prod-vnet'))
            params.set('subnetName', new BakeVariable('web-subnet'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('prod-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                osType: { value: 'linux' },
                vmName: { value: 'prod-web-vm' },
                vmSize: { value: 'Standard_D4s_v3' },
                adminUsername: { value: 'azureadmin' },
                sshPublicKey: { value: 'ssh-rsa AAAA...' },
                vnetName: { value: 'prod-vnet' },
                subnetName: { value: 'web-subnet' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AzureVm('prod-vm-deploy', ingredient, ctx)
            await plugin.Execute()

            expect(capturedParams.vmName).to.deep.equal({ value: 'prod-web-vm' })
            expect(capturedParams.vmSize).to.deep.equal({ value: 'Standard_D4s_v3' })
            expect(capturedParams.adminUsername).to.deep.equal({ value: 'azureadmin' })
            expect(capturedParams).to.not.have.property('osType')
        })
    })
})
