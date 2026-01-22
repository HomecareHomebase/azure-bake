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

import { VirtualMachineExtensions } from '../src/plugin'
import { VirtualMachineExtensionsUtils } from '../src/functions'

// Require the compiled modules to verify exports
const vmExtIndex = require('../dist/index')

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
            type: '@azbake/ingredient-azure-vm-extension',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-azure-vm-extension index exports', () => {
    it('exports plugin', () => {
        expect(vmExtIndex.plugin).to.not.be.undefined
        expect(typeof vmExtIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(vmExtIndex.pluginNS).to.equal('@azbake/ingredient-azure-vm-extension')
    })

    it('exports functions', () => {
        expect(vmExtIndex.functions).to.not.be.undefined
        expect(typeof vmExtIndex.functions).to.equal('function')
        expect(vmExtIndex.functions.name).to.equal('VirtualMachineExtensionsUtils')
    })

    it('exports functionsNS', () => {
        expect(vmExtIndex.functionsNS).to.equal('vmextensionsutility')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = vmExtIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = vmExtIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('VirtualMachineExtensions Plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys VM extension template without settings', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vmName', new BakeVariable('my-vm'))
            params.set('extName', new BakeVariable('my-extension'))
            params.set('typeHandlerVersion', new BakeVariable('1.0'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const mockVmExtUtils = {}
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                if (name === 'vmextensionsutility') return mockVmExtUtils
                return {}
            })

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                vmName: { value: 'my-vm' },
                extName: { value: 'my-extension' },
                typeHandlerVersion: { value: '1.0' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new VirtualMachineExtensions('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
            expect(mockDeployTemplate.firstCall.args[3]).to.equal('test-rg')
        })

        it('injects settings into ARM template', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vmName', new BakeVariable('my-vm'))
            params.set('extName', new BakeVariable('my-extension'))
            params.set('typeHandlerVersion', new BakeVariable('1.0'))
            params.set('settings', new BakeVariable({ commandToExecute: 'echo hello', fileUris: ['http://example.com/script.sh'] } as any))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const mockVmExtUtils = {}
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                if (name === 'vmextensionsutility') return mockVmExtUtils
                return {}
            })

            let capturedTemplate: any = null
            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedTemplate = JSON.parse(JSON.stringify(template))
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                vmName: { value: 'my-vm' },
                extName: { value: 'my-extension' },
                typeHandlerVersion: { value: '1.0' },
                settings: { value: { commandToExecute: 'echo hello', fileUris: ['http://example.com/script.sh'] } }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new VirtualMachineExtensions('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedTemplate.resources[0].properties.settings).to.deep.equal({
                commandToExecute: 'echo hello',
                fileUris: ['http://example.com/script.sh']
            })
            // Settings should be removed from params
            expect(capturedParams.settings).to.be.undefined
        })

        it('injects protectedSettings into ARM template', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vmName', new BakeVariable('my-vm'))
            params.set('extName', new BakeVariable('my-extension'))
            params.set('typeHandlerVersion', new BakeVariable('1.0'))
            params.set('protectedSettings', new BakeVariable({ storageAccountKey: 'secret-key-123', storageAccountName: 'mystorageaccount' } as any))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const mockVmExtUtils = {}
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                if (name === 'vmextensionsutility') return mockVmExtUtils
                return {}
            })

            let capturedTemplate: any = null
            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedTemplate = JSON.parse(JSON.stringify(template))
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                vmName: { value: 'my-vm' },
                extName: { value: 'my-extension' },
                typeHandlerVersion: { value: '1.0' },
                protectedSettings: { value: { storageAccountKey: 'secret-key-123', storageAccountName: 'mystorageaccount' } }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new VirtualMachineExtensions('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedTemplate.resources[0].properties.protectedSettings).to.deep.equal({
                storageAccountKey: 'secret-key-123',
                storageAccountName: 'mystorageaccount'
            })
            // protectedSettings should be removed from params
            expect(capturedParams.protectedSettings).to.be.undefined
        })

        it('injects both settings and protectedSettings into ARM template', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vmName', new BakeVariable('my-vm'))
            params.set('extName', new BakeVariable('my-extension'))
            params.set('typeHandlerVersion', new BakeVariable('1.0'))
            params.set('settings', new BakeVariable({ commandToExecute: 'echo hello' } as any))
            params.set('protectedSettings', new BakeVariable({ storageAccountKey: 'secret-key' } as any))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const mockVmExtUtils = {}
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                if (name === 'vmextensionsutility') return mockVmExtUtils
                return {}
            })

            let capturedTemplate: any = null
            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedTemplate = JSON.parse(JSON.stringify(template))
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                vmName: { value: 'my-vm' },
                extName: { value: 'my-extension' },
                typeHandlerVersion: { value: '1.0' },
                settings: { value: { commandToExecute: 'echo hello' } },
                protectedSettings: { value: { storageAccountKey: 'secret-key' } }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new VirtualMachineExtensions('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedTemplate.resources[0].properties.settings).to.deep.equal({
                commandToExecute: 'echo hello'
            })
            expect(capturedTemplate.resources[0].properties.protectedSettings).to.deep.equal({
                storageAccountKey: 'secret-key'
            })
            expect(capturedParams.settings).to.be.undefined
            expect(capturedParams.protectedSettings).to.be.undefined
        })

        it('handles settings with multiple properties', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vmName', new BakeVariable('my-vm'))
            params.set('extName', new BakeVariable('my-extension'))
            params.set('typeHandlerVersion', new BakeVariable('1.0'))
            
            const settingsObj = {
                commandToExecute: 'echo hello',
                fileUris: ['http://example.com/script1.sh', 'http://example.com/script2.sh'],
                workingDirectory: '/tmp',
                skipDos2Unix: false
            }
            params.set('settings', new BakeVariable(settingsObj as any))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const mockVmExtUtils = {}
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                if (name === 'vmextensionsutility') return mockVmExtUtils
                return {}
            })

            let capturedTemplate: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedTemplate = JSON.parse(JSON.stringify(template))
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                vmName: { value: 'my-vm' },
                extName: { value: 'my-extension' },
                typeHandlerVersion: { value: '1.0' },
                settings: { value: settingsObj }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new VirtualMachineExtensions('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedTemplate.resources[0].properties.settings.commandToExecute).to.equal('echo hello')
            expect(capturedTemplate.resources[0].properties.settings.fileUris).to.deep.equal(['http://example.com/script1.sh', 'http://example.com/script2.sh'])
            expect(capturedTemplate.resources[0].properties.settings.workingDirectory).to.equal('/tmp')
            expect(capturedTemplate.resources[0].properties.settings.skipDos2Unix).to.equal(false)
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vmName', new BakeVariable('my-vm'))
            params.set('extName', new BakeVariable('my-extension'))
            params.set('typeHandlerVersion', new BakeVariable('1.0'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const mockVmExtUtils = {}
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                if (name === 'vmextensionsutility') return mockVmExtUtils
                return {}
            })

            const deploymentError = new Error('VM Extension deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                vmName: { value: 'my-vm' },
                extName: { value: 'my-extension' },
                typeHandlerVersion: { value: '1.0' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new VirtualMachineExtensions('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('VM Extension deployment failed')
            }
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vmName', new BakeVariable('my-vm'))
            params.set('extName', new BakeVariable('my-extension'))
            params.set('typeHandlerVersion', new BakeVariable('1.0'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const mockVmExtUtils = {}
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                if (name === 'vmextensionsutility') return mockVmExtUtils
                return {}
            })

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

            const plugin = new VirtualMachineExtensions('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedCtx).to.not.be.null
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('passes ingredient name to BakeParamsToARMParamsAsync', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vmName', new BakeVariable('my-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const mockVmExtUtils = {}
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                if (name === 'vmextensionsutility') return mockVmExtUtils
                return {}
            })

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new VirtualMachineExtensions('my-vmext-name', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.calledWith('my-vmext-name', params)).to.be.true
        })

        it('handles empty settings object', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vmName', new BakeVariable('my-vm'))
            params.set('extName', new BakeVariable('my-extension'))
            params.set('typeHandlerVersion', new BakeVariable('1.0'))
            params.set('settings', new BakeVariable({} as any))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const mockVmExtUtils = {}
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                if (name === 'vmextensionsutility') return mockVmExtUtils
                return {}
            })

            let capturedTemplate: any = null
            let capturedParams: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any, params: any) => {
                capturedTemplate = JSON.parse(JSON.stringify(template))
                capturedParams = params
                return Promise.resolve({})
            })
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                vmName: { value: 'my-vm' },
                extName: { value: 'my-extension' },
                typeHandlerVersion: { value: '1.0' },
                settings: { value: {} }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new VirtualMachineExtensions('test', ingredient, ctx)
            await plugin.Execute()

            // Empty settings object should still be created but be empty
            expect(capturedTemplate.resources[0].properties.settings).to.deep.equal({})
            expect(capturedParams.settings).to.be.undefined
        })

        it('handles BakeParamsToARMParamsAsync failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vmName', new BakeVariable('my-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const mockVmExtUtils = {}
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                if (name === 'vmextensionsutility') return mockVmExtUtils
                return {}
            })

            const paramError = new Error('Failed to convert params')
            const mockBakeParamsToARMParamsAsync = sandbox.stub().rejects(paramError)
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new VirtualMachineExtensions('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Failed to convert params')
            }
        })

        it('handles resource_group resolution failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vmName', new BakeVariable('my-vm'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const rgError = new Error('Could not resolve resource group')
            const mockUtils = {
                resource_group: sandbox.stub().rejects(rgError)
            }
            const mockVmExtUtils = {}
            sandbox.stub(IngredientManager, 'getIngredientFunction').callsFake((name: string) => {
                if (name === 'coreutils') return mockUtils
                if (name === 'vmextensionsutility') return mockVmExtUtils
                return {}
            })

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                vmName: { value: 'my-vm' }
            })
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new VirtualMachineExtensions('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Could not resolve resource group')
            }
        })
    })
})

describe('VirtualMachineExtensionsUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates VM extension resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobvmexttst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new VirtualMachineExtensionsUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devglobvmexttst')
            expect(mockUtils.create_resource_name.calledWith('vmext', null, false)).to.be.true
        })
    })

    describe('get', () => {
        it('retrieves VM extension by name', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockExtension = {
                id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm/extensions/ext',
                name: 'myExtension',
                type: 'Microsoft.Compute/virtualMachines/extensions',
                location: 'eastus',
                provisioningState: 'Succeeded'
            }

            const mockVmExtensionsClient = {
                get: sandbox.stub().resolves(mockExtension)
            }

            const armCompute = require('@azure/arm-compute')
            sandbox.stub(armCompute, 'ComputeManagementClientContext').returns({})
            sandbox.stub(armCompute, 'VirtualMachineExtensions').returns(mockVmExtensionsClient)

            const utils = new VirtualMachineExtensionsUtils(ctx)
            const result = await utils.get('test-rg', 'my-vm', 'myExtension')

            expect(result).to.deep.equal(mockExtension)
            expect(mockVmExtensionsClient.get.calledWith('test-rg', 'my-vm', 'myExtension')).to.be.true
        })

        it('uses provided resource group', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockVmExtensionsClient = {
                get: sandbox.stub().resolves({})
            }

            const armCompute = require('@azure/arm-compute')
            sandbox.stub(armCompute, 'ComputeManagementClientContext').returns({})
            sandbox.stub(armCompute, 'VirtualMachineExtensions').returns(mockVmExtensionsClient)

            const utils = new VirtualMachineExtensionsUtils(ctx)
            await utils.get('custom-rg', 'my-vm', 'myExtension')

            expect(mockVmExtensionsClient.get.calledWith('custom-rg', 'my-vm', 'myExtension')).to.be.true
        })
    })

    describe('list', () => {
        it('lists all VM extensions for a VM', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockExtensionsList = {
                value: [
                    { name: 'extension1', provisioningState: 'Succeeded' },
                    { name: 'extension2', provisioningState: 'Succeeded' }
                ]
            }

            const mockVmExtensionsClient = {
                list: sandbox.stub().resolves(mockExtensionsList)
            }

            const armCompute = require('@azure/arm-compute')
            sandbox.stub(armCompute, 'ComputeManagementClientContext').returns({})
            sandbox.stub(armCompute, 'VirtualMachineExtensions').returns(mockVmExtensionsClient)

            const utils = new VirtualMachineExtensionsUtils(ctx)
            const result = await utils.list('test-rg', 'my-vm', 'ext')

            expect(result).to.deep.equal(mockExtensionsList)
            expect(mockVmExtensionsClient.list.calledWith('test-rg', 'my-vm')).to.be.true
        })

        it('uses provided resource group for list', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockVmExtensionsClient = {
                list: sandbox.stub().resolves({ value: [] })
            }

            const armCompute = require('@azure/arm-compute')
            sandbox.stub(armCompute, 'ComputeManagementClientContext').returns({})
            sandbox.stub(armCompute, 'VirtualMachineExtensions').returns(mockVmExtensionsClient)

            const utils = new VirtualMachineExtensionsUtils(ctx)
            await utils.list('specific-rg', 'my-vm', 'ext')

            expect(mockVmExtensionsClient.list.calledWith('specific-rg', 'my-vm')).to.be.true
        })
    })

    describe('update', () => {
        it('updates VM extension with given parameters', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const extensionParams = {
                autoUpgradeMinorVersion: true,
                settings: { commandToExecute: 'echo updated' }
            }

            const mockUpdateResponse = {
                id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm/extensions/ext',
                name: 'myExtension',
                provisioningState: 'Succeeded'
            }

            const mockVmExtensionsClient = {
                update: sandbox.stub().resolves(mockUpdateResponse)
            }

            const armCompute = require('@azure/arm-compute')
            sandbox.stub(armCompute, 'ComputeManagementClientContext').returns({})
            sandbox.stub(armCompute, 'VirtualMachineExtensions').returns(mockVmExtensionsClient)

            const utils = new VirtualMachineExtensionsUtils(ctx)
            const result = await utils.update('test-rg', 'my-vm', 'myExtension', extensionParams)

            expect(result).to.deep.equal(mockUpdateResponse)
            expect(mockVmExtensionsClient.update.calledWith('test-rg', 'my-vm', 'myExtension', extensionParams)).to.be.true
        })

        it('uses provided resource group for update', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('default-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const extensionParams = {
                autoUpgradeMinorVersion: false
            }

            const mockVmExtensionsClient = {
                update: sandbox.stub().resolves({})
            }

            const armCompute = require('@azure/arm-compute')
            sandbox.stub(armCompute, 'ComputeManagementClientContext').returns({})
            sandbox.stub(armCompute, 'VirtualMachineExtensions').returns(mockVmExtensionsClient)

            const utils = new VirtualMachineExtensionsUtils(ctx)
            await utils.update('another-rg', 'my-vm', 'myExtension', extensionParams)

            expect(mockVmExtensionsClient.update.calledWith('another-rg', 'my-vm', 'myExtension', extensionParams)).to.be.true
        })
    })
})
