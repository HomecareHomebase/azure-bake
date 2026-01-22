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

import { HostNames } from '../src/plugin'

// Require the compiled modules to verify exports
const hostNamesIndex = require('../dist/index')

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
            type: '@azbake/ingredient-host-names',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-host-names index exports', () => {
    it('exports plugin', () => {
        expect(hostNamesIndex.plugin).to.not.be.undefined
        expect(typeof hostNamesIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(hostNamesIndex.pluginNS).to.equal('@azbake/ingredient-host-names')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = hostNamesIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })
})

describe('HostNames Plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('constructor', () => {
        it('creates instance with correct name', () => {
            const params = new Map<string, BakeVariable>()
            const ingredient = createIngredient(params)
            const ctx = createContext(undefined, ingredient)

            const plugin = new HostNames('test-name', ingredient, ctx)
            
            expect(plugin._name).to.equal('test-name')
                expect(plugin._ctx).to.not.be.undefined
                expect(plugin._ctx.Region).to.deep.equal(ctx.Region)
        })
    })

    describe('Execute', () => {
        it('deploys host name binding successfully', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('certificate', new BakeVariable('[myrg]/mycert'))
            
            const source = new BakeVariable('www.example.com')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobwebapptst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'myrg', resource: 'mycert' }),
                current_region: sandbox.stub().returns({ name: 'East US' }),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub().resolves({})
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                certificate: { value: '[myrg]/mycert' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new HostNames('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockUtils.create_resource_name.calledWith('webapp', null, true)).to.be.true
            expect(mockUtils.parseResource.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('certificate', new BakeVariable('[myrg]/mycert'))
            
            const source = new BakeVariable('www.example.com')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobwebapptst'),
                parseResource: sandbox.stub().returns({ resourceGroup: 'myrg', resource: 'mycert' }),
                current_region: sandbox.stub().returns({ name: 'East US' }),
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Deployment failed')
            const mockDeployTemplate = sandbox.stub().rejects(deploymentError)
            const mockBakeParamsToARMParamsAsync = sandbox.stub().resolves({
                certificate: { value: '[myrg]/mycert' }
            })
            
            const ARMHelperStub = sandbox.stub().returns({
                DeployTemplate: mockDeployTemplate,
                BakeParamsToARMParamsAsync: mockBakeParamsToARMParamsAsync
            })
            
            const armHelper = require('@azbake/arm-helper')
            sandbox.stub(armHelper, 'ARMHelper').callsFake(ARMHelperStub)

            const plugin = new HostNames('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Deployment failed')
            }
        })
    })
})
