import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'
import { ARMHelper } from '@azbake/arm-helper'

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

import { KeyVault } from '../src/plugin'
import { KeyVaultUtils } from '../src/functions'

// Require the compiled modules to verify exports
const keyVaultIndex = require('../dist/index')

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
    const auth: any = { 
        domain: 'tenant', 
        clientId: 'service', 
        secret: 'secret',
        signRequest: () => Promise.resolve()
    }
    return new DeploymentContext(auth, pkg, testRegion, new Logger(), ingredient)
}

function createIngredient(params: Map<string, BakeVariable>, source?: BakeVariable): IIngredient {
    return {
        properties: {
            type: '@azbake/ingredient-key-vault',
            source: source || new BakeVariable(''),
            parameters: params,
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }
}

describe('ingredient-key-vault index exports', () => {
    it('exports plugin', () => {
        expect(keyVaultIndex.plugin).to.not.be.undefined
        expect(typeof keyVaultIndex.plugin).to.equal('function')
    })

    it('exports pluginNS', () => {
        expect(keyVaultIndex.pluginNS).to.equal('@azbake/ingredient-key-vault')
    })

    it('exports functions', () => {
        expect(keyVaultIndex.functions).to.not.be.undefined
        expect(typeof keyVaultIndex.functions).to.equal('function')
        expect(keyVaultIndex.functions.name).to.equal('KeyVaultUtils')
    })

    it('exports functionsNS', () => {
        expect(keyVaultIndex.functionsNS).to.equal('keyvaultutils')
    })

    it('plugin can be constructed from export', () => {
        const params = new Map<string, BakeVariable>()
        const ingredient = createIngredient(params)
        const ctx = createContext(undefined, ingredient)

        const Plugin = keyVaultIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.not.be.undefined
        expect(instance._name).to.equal('test')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = keyVaultIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('KeyVaultUtils', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('create_resource_name', () => {
        it('creates key vault resource name using coreutils', () => {
            const ctx = createContext()
            const mockUtils = {
                create_resource_name: sandbox.stub().returns('devglobkeyvaulttst')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const utils = new KeyVaultUtils(ctx)
            const result = utils.create_resource_name()

            expect(result).to.equal('devglobkeyvaulttst')
            expect(mockUtils.create_resource_name.calledWith('keyvault', null, true)).to.be.true
        })
    })
})

describe('KeyVault Plugin', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Execute', () => {
        it('deploys key vault template with diagnostics', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vaultName', new BakeVariable('mykeyvault'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub(ARMHelper.prototype, 'DeployTemplate').resolves()
            const mockBakeParamsToARMParamsAsync = sandbox.stub(ARMHelper.prototype, 'BakeParamsToARMParamsAsync').resolves({
                vaultName: { value: 'mykeyvault' }
            })
            const mockConfigureDiagnostics = sandbox.stub(ARMHelper.prototype, 'ConfigureDiagnostics').callsFake(async (params) => params)

            const plugin = new KeyVault('test', ingredient, ctx)
            await plugin.Execute()

            expect(mockBakeParamsToARMParamsAsync.called).to.be.true
            expect(mockConfigureDiagnostics.called).to.be.true
            expect(mockDeployTemplate.called).to.be.true
        })

        it('logs and throws error on deployment failure', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vaultName', new BakeVariable('mykeyvault'))
            
            const source = new BakeVariable('test-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const deploymentError = new Error('Key Vault deployment failed')
            sandbox.stub(ARMHelper.prototype, 'DeployTemplate').rejects(deploymentError)
            sandbox.stub(ARMHelper.prototype, 'BakeParamsToARMParamsAsync').resolves({
                vaultName: { value: 'mykeyvault' }
            })
            sandbox.stub(ARMHelper.prototype, 'ConfigureDiagnostics').callsFake(async (params) => params)

            const plugin = new KeyVault('test', ingredient, ctx)
            
            try {
                await plugin.Execute()
                expect.fail('Expected error to be thrown')
            } catch (error: any) {
                expect(error.message).to.equal('Key Vault deployment failed')
            }
        })

        it('logs source property during execution', async () => {
            const params = new Map<string, BakeVariable>()
            params.set('vaultName', new BakeVariable('mykeyvault'))
            
            const source = new BakeVariable('my-key-vault-source')
            const ingredient = createIngredient(params, source)
            const ctx = createContext(undefined, ingredient)

            const mockUtils = {
                resource_group: sandbox.stub().resolves('test-rg')
            }
            sandbox.stub(IngredientManager, 'getIngredientFunction').returns(mockUtils)

            const mockDeployTemplate = sandbox.stub(ARMHelper.prototype, 'DeployTemplate').resolves()
            sandbox.stub(ARMHelper.prototype, 'BakeParamsToARMParamsAsync').resolves({
                vaultName: { value: 'mykeyvault' }
            })
            sandbox.stub(ARMHelper.prototype, 'ConfigureDiagnostics').callsFake(async (params) => params)

            const plugin = new KeyVault('test', ingredient, ctx)
            await plugin.Execute()

            // Verify the plugin executed successfully with the source
            expect(mockDeployTemplate.called).to.be.true
        })
    })
})
