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

import { AvailabilitySetPlugin } from '../src/plugin'
import { AvailabilitySetUtils } from '../src/functions'

// Require the compiled modules to verify exports
const availSetIndex = require('../dist/index')

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
            type: '@azbake/ingredient-availability-set',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-availability-set index exports', () => {
    it('exports plugin', () => {
        expect(availSetIndex.plugin).to.not.be.undefined
        expect(typeof availSetIndex.plugin).to.equal('function')
        expect(availSetIndex.plugin.name).to.equal('AvailabilitySetPlugin')
    })

    it('exports pluginNS', () => {
        expect(availSetIndex.pluginNS).to.equal('@azbake/ingredient-availability-set')
    })

    it('exports functions', () => {
        expect(availSetIndex.functions).to.not.be.undefined
        expect(typeof availSetIndex.functions).to.equal('function')
        expect(availSetIndex.functions.name).to.equal('AvailabilitySetUtils')
    })

    it('exports functionsNS', () => {
        expect(availSetIndex.functionsNS).to.equal('availutils')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = availSetIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = availSetIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('AvailabilitySetUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates availability set resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveus1availtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AvailabilitySetUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('deveus1availtst')
            expect(mockUtils.create_resource_name.calledWith('avail', null, true)).to.be.true
        })

        it('creates availability set resource name with custom shortName', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveus1availmyapp')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AvailabilitySetUtils(ctx)
            const result = utils.create_resource_name('myapp')

            expect(result).to.equal('deveus1availmyapp')
            expect(mockUtils.create_resource_name.calledWith('avail', 'myapp', true)).to.be.true
        })

        it('passes undefined shortName as null to coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('deveus1availtst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new AvailabilitySetUtils(ctx)
            utils.create_resource_name(undefined)

            expect(mockUtils.create_resource_name.calledWith('avail', null, true)).to.be.true
        })
    })

    describe('get_fault_domain_count', () => {
        it('retrieves fault domain count from Azure resource', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockResourcesClient = {
                resources: {
                    get: sandbox.stub().resolves({
                        properties: {
                            platformFaultDomainCount: 3
                        }
                    })
                }
            }

            const armResources = require('@azure/arm-resources')
            sandbox.stub(armResources, 'ResourceManagementClient').returns(mockResourcesClient)

            const utils = new AvailabilitySetUtils(ctx)
            const result = await utils.get_fault_domain_count('my-avail-set')

            expect(result).to.equal(3)
            expect(mockResourcesClient.resources.get.calledWith(
                'test-rg',
                'Microsoft.Compute',
                '',
                'availabilitySets',
                'my-avail-set',
                '2018-06-01'
            )).to.be.true
        })

        it('uses coreutils to get resource group', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('my-resource-group')
            }
            const getIngredientFunctionStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockResourcesClient = {
                resources: {
                    get: sandbox.stub().resolves({
                        properties: {
                            platformFaultDomainCount: 2
                        }
                    })
                }
            }

            const armResources = require('@azure/arm-resources')
            sandbox.stub(armResources, 'ResourceManagementClient').returns(mockResourcesClient)

            const utils = new AvailabilitySetUtils(ctx)
            await utils.get_fault_domain_count('test-avset')

            expect(getIngredientFunctionStub.calledWith('coreutils', ctx)).to.be.true
            expect(mockUtils.resource_group.calledOnce).to.be.true
        })

        it('creates ResourceManagementClient with correct credentials', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedToken: any = null
            let capturedSubId: any = null

            const mockResourcesClient = {
                resources: {
                    get: sandbox.stub().resolves({
                        properties: {
                            platformFaultDomainCount: 2
                        }
                    })
                }
            }

            const armResources = require('@azure/arm-resources')
            sandbox.stub(armResources, 'ResourceManagementClient').callsFake((token: any, subId: any) => {
                capturedToken = token
                capturedSubId = subId
                return mockResourcesClient
            })

            const utils = new AvailabilitySetUtils(ctx)
            await utils.get_fault_domain_count('test-avset')

            expect(capturedSubId).to.equal('test-sub-id')
        })
    })

    describe('get_update_domain_count', () => {
        it('retrieves update domain count from Azure resource', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockResourcesClient = {
                resources: {
                    get: sandbox.stub().resolves({
                        properties: {
                            platformUpdateDomainCount: 5
                        }
                    })
                }
            }

            const armResources = require('@azure/arm-resources')
            sandbox.stub(armResources, 'ResourceManagementClient').returns(mockResourcesClient)

            const utils = new AvailabilitySetUtils(ctx)
            const result = await utils.get_update_domain_count('my-avail-set')

            expect(result).to.equal(5)
            expect(mockResourcesClient.resources.get.calledWith(
                'test-rg',
                'Microsoft.Compute',
                '',
                'availabilitySets',
                'my-avail-set',
                '2018-06-01'
            )).to.be.true
        })

        it('uses different resource names for different availability sets', async () => {
            const ctx = createContext()
            const mockUtils = {
                resource_group: sandbox.stub().resolves('prod-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockResourcesClient = {
                resources: {
                    get: sandbox.stub().resolves({
                        properties: {
                            platformUpdateDomainCount: 10
                        }
                    })
                }
            }

            const armResources = require('@azure/arm-resources')
            sandbox.stub(armResources, 'ResourceManagementClient').returns(mockResourcesClient)

            const utils = new AvailabilitySetUtils(ctx)
            const result = await utils.get_update_domain_count('prod-availability-set')

            expect(result).to.equal(10)
            expect(mockResourcesClient.resources.get.firstCall.args[4]).to.equal('prod-availability-set')
        })
    })
})

describe('AvailabilitySetPlugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys availability set ARM template', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('availabilitySetName', new BakeVariable('my-avail-set'))
            params.set('faultDomainCount', new BakeVariable('3'))
            params.set('updateDomainCount', new BakeVariable('5'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                availabilitySetName: { value: 'my-avail-set' },
                faultDomainCount: { value: '3' },
                updateDomainCount: { value: '5' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AvailabilitySetPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.calledOnce).to.be.true
            expect(mockDeployTemplate.calledOnce).to.be.true
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('availabilitySetName', new BakeVariable('my-avail-set'))
            
            const source = new BakeVariable('avail-set-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

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

            const plugin = new AvailabilitySetPlugin('test', ingredient, ctx)
            const logSpy = sandbox.spy(plugin._logger, 'log')

            await plugin.Execute()

            // Check that log was called with source info
            expect(logSpy.called).to.be.true
            const logCalls = logSpy.getCalls()
            const sourceLogCall = logCalls.find(call => 
                call.args[0].includes('Availability Set Plugin Logging')
            )
            expect(sourceLogCall).to.not.be.undefined
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('availabilitySetName', new BakeVariable('my-avail-set'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Availability Set deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const plugin = new AvailabilitySetPlugin('test', ingredient, ctx)
            const errorSpy = sandbox.spy(plugin._logger, 'error')

            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Availability Set deployment failed')
                expect(errorSpy.calledOnce).to.be.true
                expect(errorSpy.firstCall.args[0]).to.include('deployment failed')
            }
        })

        it('passes correct resource group to DeployTemplate', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('availabilitySetName', new BakeVariable('my-avail-set'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('my-avail-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({})
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AvailabilitySetPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockDeployTemplate.firstCall.args[3]).to.equal('my-avail-rg')
        })

        it('passes ingredient name to BakeParamsToARMParamsAsync', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('availabilitySetName', new BakeVariable('my-avail-set'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({})
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AvailabilitySetPlugin('my-availability-set', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.calledWith('my-availability-set', params)).to.be.true
        })

        it('uses coreutils from IngredientManager', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('availabilitySetName', new BakeVariable('my-avail-set'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            const getIngredientFunctionStub = sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: sandbox.stub().resolves({}),
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({})
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AvailabilitySetPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(getIngredientFunctionStub.calledWith('coreutils', ctx)).to.be.true
        })

        it('creates ARMHelper with correct context', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('availabilitySetName', new BakeVariable('my-avail-set'))
            
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
                    BakeParamsToARMParamsAsync: sandbox.stub().resolves({})
                }
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AvailabilitySetPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedCtx).to.not.be.null
            expect(capturedCtx.Environment.authentication.subscriptionId).to.equal('test-sub-id')
        })

        it('deploys with multiple parameters', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('availabilitySetName', new BakeVariable('prod-avail-set'))
            params.set('faultDomainCount', new BakeVariable('2'))
            params.set('updateDomainCount', new BakeVariable('20'))
            params.set('location', new BakeVariable('westus2'))
            params.set('sku', new BakeVariable('Aligned'))
            
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
                availabilitySetName: { value: 'prod-avail-set' },
                faultDomainCount: { value: '2' },
                updateDomainCount: { value: '20' },
                location: { value: 'westus2' },
                sku: { value: 'Aligned' }
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AvailabilitySetPlugin('test', ingredient, ctx)
            await plugin.Execute()

            expect(capturedParams.availabilitySetName).to.deep.equal({ value: 'prod-avail-set' })
            expect(capturedParams.faultDomainCount).to.deep.equal({ value: '2' })
            expect(capturedParams.updateDomainCount).to.deep.equal({ value: '20' })
            expect(capturedParams.location).to.deep.equal({ value: 'westus2' })
            expect(capturedParams.sku).to.deep.equal({ value: 'Aligned' })
        })

        it('uses built-in ARM template from arm.json', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('availabilitySetName', new BakeVariable('my-avail-set'))
            
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            let capturedTemplate: any = null
            const mockDeployTemplate = sandbox.stub().callsFake((name: string, template: any) => {
                capturedTemplate = template
                return Promise.resolve({})
            })

            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: sandbox.stub().resolves({})
            })

            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new AvailabilitySetPlugin('test', ingredient, ctx)
            await plugin.Execute()

            // Verify a template was passed (the built-in ARM template)
            expect(capturedTemplate).to.not.be.null
            expect(capturedTemplate).to.not.be.undefined
        })
    })
})
