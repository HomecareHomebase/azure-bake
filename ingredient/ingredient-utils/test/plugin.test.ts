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
    BakeVariable
} from '@azbake/core'

import { CoreUtils } from '../src/functions'

// Require the compiled modules to verify exports
const utilsIndex = require('../dist/index')

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
        regions: [
            { name: 'East US', shortName: 'eus', code: 'eus1' },
            { name: 'West US', shortName: 'wus', code: 'wus1' }
        ],
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

describe('ingredient-utils index exports', () => {
    it('exports null plugin since utils has no plugin', () => {
        expect(utilsIndex.plugin).to.be.null
    })

    it('exports null pluginNS', () => {
        expect(utilsIndex.pluginNS).to.be.null
    })

    it('exports functions', () => {
        expect(utilsIndex.functions).to.not.be.undefined
        expect(typeof utilsIndex.functions).to.equal('function')
        expect(utilsIndex.functions.name).to.equal('CoreUtils')
    })

    it('exports functionsNS', () => {
        expect(utilsIndex.functionsNS).to.equal('coreutils')
    })

    it('functions can be constructed from export', () => {
        const ctx = createContext()
        const Functions = utilsIndex.functions
        const instance = new Functions(ctx)
        expect(instance).to.not.be.undefined
        expect(instance.context).to.equal(ctx)
    })
})

describe('CoreUtils additional coverage', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('type conversion utilities', () => {
        it('toNumber handles negative numbers', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            expect(utils.toNumber('-42')).to.equal(-42)
            expect(utils.toNumber(-100)).to.equal(-100)
        })

        it('toNumber handles floating point (truncates to integer)', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            expect(utils.toNumber('3.14')).to.equal(3)
            expect(utils.toNumber('99.99')).to.equal(99)
        })

        it('toString handles objects', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            expect(utils.toString({ test: 'value' })).to.equal('[object Object]')
        })

        it('toBoolean with actual boolean values', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            expect(utils.toBoolean(true)).to.equal(true)
            expect(utils.toBoolean(false)).to.equal(false)
        })

        it('toJsonString handles primitives', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            expect(utils.toJsonString('hello')).to.equal('"hello"')
            expect(utils.toJsonString(42)).to.equal('42')
            expect(utils.toJsonString(true)).to.equal('true')
            expect(utils.toJsonString(undefined)).to.equal(undefined)
        })
    })

    describe('region utilities', () => {
        it('current_region returns the current deployment region', () => {
            const region: IBakeRegion = { name: 'Central US', shortName: 'cus', code: 'cus1' }
            const ctx = createContext(region)
            const utils = new CoreUtils(ctx)

            expect(utils.current_region()).to.deep.equal(region)
        })

        it('current_region_primary correctly identifies primary region', () => {
            const primaryRegion: IBakeRegion = { name: 'East US', shortName: 'eus', code: 'eus1' }
            const ctx = createContext(primaryRegion)
            const utils = new CoreUtils(ctx)

            expect(utils.current_region_primary()).to.equal(true)
        })

        it('current_region_primary returns false for secondary region', () => {
            const secondaryRegion: IBakeRegion = { name: 'West US', shortName: 'wus', code: 'wus1' }
            const ctx = createContext(secondaryRegion)
            const utils = new CoreUtils(ctx)

            expect(utils.current_region_primary()).to.equal(false)
        })

        it('current_region_primary returns false when no regions configured', () => {
            const ctx = createContext()
            ctx.Environment.regions = []
            const utils = new CoreUtils(ctx)

            expect(utils.current_region_primary()).to.equal(false)
        })

        it('primary_region returns first region in array', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const primary = utils.primary_region()
            expect(primary).to.deep.equal({ name: 'East US', shortName: 'eus', code: 'eus1' })
        })

        it('primary_region returns null when no regions', () => {
            const ctx = createContext()
            ctx.Environment.regions = []
            const utils = new CoreUtils(ctx)

            expect(utils.primary_region()).to.be.null
        })

        it('secondary_region returns second region in array', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const secondary = utils.secondary_region()
            expect(secondary).to.deep.equal({ name: 'West US', shortName: 'wus', code: 'wus1' })
        })

        it('secondary_region returns primary when only one region', () => {
            const ctx = createContext()
            ctx.Environment.regions = [{ name: 'East US', shortName: 'eus', code: 'eus1' }]
            const utils = new CoreUtils(ctx)

            const secondary = utils.secondary_region()
            expect(secondary).to.deep.equal({ name: 'East US', shortName: 'eus', code: 'eus1' })
        })

        it('secondary_region returns null when no regions', () => {
            const ctx = createContext()
            ctx.Environment.regions = []
            const utils = new CoreUtils(ctx)

            expect(utils.secondary_region()).to.be.null
        })
    })

    describe('resource group utilities', () => {
        it('resource_group respects rgOverride', async () => {
            const ctx = createContext()
            ctx.Config.rgOverride = new BakeVariable('CUSTOM_OVERRIDE_RG')
            const utils = new CoreUtils(ctx)

            const rg = await utils.resource_group()
            expect(rg).to.equal('CUSTOM_OVERRIDE_RG')
        })

        it('resource_group ignores rgOverride when ignoreOverride is true', async () => {
            const ctx = createContext()
            ctx.Config.rgOverride = new BakeVariable('CUSTOM_OVERRIDE_RG')
            const utils = new CoreUtils(ctx)

            const rg = await utils.resource_group('myapp', true, null, true)
            expect(rg).to.equal('RG_MYAPP_EUS1_DEV')
        })

        it('resource_group uses custom region when provided', async () => {
            const ctx = createContext()
            const customRegion: IBakeRegion = { name: 'Central US', shortName: 'cus', code: 'cus1' }
            const utils = new CoreUtils(ctx)

            const rg = await utils.resource_group('app', true, customRegion)
            expect(rg).to.equal('RG_APP_CUS1_DEV')
        })

        it('resource_group excludes region code when useRegionCode is false', async () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const rg = await utils.resource_group('global-app', false)
            expect(rg).to.equal('RG_GLOBAL-APP_DEV')
        })

        it('resource_group uses package shortName when name is null', async () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const rg = await utils.resource_group(null)
            expect(rg).to.equal('RG_TST_EUS1_DEV')
        })

        it('get_resource_group without using region code', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const rg = utils.get_resource_group('shared', false)
            expect(rg).to.equal('RG_SHARED_DEV')
        })
    })

    describe('resource naming utilities', () => {
        it('create_resource_name with all parameters', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const name = utils.create_resource_name('web', 'api', true, 'v2')
            expect(name).to.equal('deveus1webapiv2')
        })

        it('create_resource_name without region code', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const name = utils.create_resource_name('web', 'api', false, 'v2')
            expect(name).to.equal('devwebapiv2')
        })

        it('create_resource_name with default suffix (empty)', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const name = utils.create_resource_name('kv', 'myapp')
            expect(name).to.equal('deveus1kvmyapp')
        })

        it('create_resource_name uses package shortName when name is null', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const name = utils.create_resource_name('svc', null)
            expect(name).to.equal('deveus1svctst')
        })

        it('create_region_resource_name with specific region', () => {
            const ctx = createContext()
            const region: IBakeRegion = { name: 'West US 2', shortName: 'wus2', code: 'wus2' }
            const utils = new CoreUtils(ctx)

            const name = utils.create_region_resource_name('db', 'sql', region, '01')
            expect(name).to.equal('devwus2dbsql01')
        })

        it('create_region_resource_name with null region', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const name = utils.create_region_resource_name('cache', 'redis', null)
            expect(name).to.equal('devcacheredis')
        })

        it('create_storage_name generates storage account compatible names', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const name = utils.create_storage_name('logs')
            expect(name).to.equal('deveus1stlogs')
        })

        it('create_storage_name with suffix', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const name = utils.create_storage_name('data', '01')
            expect(name).to.equal('deveus1stdata01')
        })

        it('create_app_svc_name generates app service name', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const name = utils.create_app_svc_name()
            expect(name).to.equal('deveus1appsvctst')
        })

        it('create_cert_name generates certificate name', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const name = utils.create_cert_name()
            expect(name).to.equal('deveus1certtst')
        })

        it('get_cert_name combines resource group and cert name', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const fullName = utils.get_cert_name('webapp')
            expect(fullName).to.equal('RG_WEBAPP_EUS1_DEV/deveus1certwebapp')
        })

        it('get_cert_name with custom resource group', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const fullName = utils.get_cert_name('webapp', 'CUSTOM_RG')
            expect(fullName).to.equal('CUSTOM_RG/deveus1certwebapp')
        })

        it('get_app_svc_name combines resource group and app service name', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const fullName = utils.get_app_svc_name('myapi')
            expect(fullName).to.equal('RG_MYAPI_EUS1_DEV/deveus1appsvcmyapi')
        })

        it('get_app_svc_name with custom resource group', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const fullName = utils.get_app_svc_name('myapi', 'CUSTOM_RG')
            expect(fullName).to.equal('CUSTOM_RG/deveus1appsvcmyapi')
        })
    })

    describe('variable utilities', () => {
        it('variable returns default when variable not found', async () => {
            const ctx = createContext()
            ctx.Config.variables = new Map()
            const utils = new CoreUtils(ctx)

            const value = await utils.variable('nonexistent', 'default-value')
            expect(value).to.equal('default-value')
        })

        it('variable returns empty string when no default provided', async () => {
            const ctx = createContext()
            ctx.Config.variables = new Map()
            const utils = new CoreUtils(ctx)

            const value = await utils.variable('nonexistent')
            expect(value).to.equal('')
        })

        it('variable resolves case-insensitively', async () => {
            const ctx = createContext()
            ctx.Config.variables = new Map([
                ['MyVariable', new BakeVariable('found')]
            ])
            const utils = new CoreUtils(ctx)

            expect(await utils.variable('myvariable')).to.equal('found')
            expect(await utils.variable('MYVARIABLE')).to.equal('found')
        })

        it('regionVariable prefers region-specific variable', async () => {
            const ctx = createContext()
            ctx.Config.variables = new Map([
                ['eus__dbServer', new BakeVariable('east-db')],
                ['wus__dbServer', new BakeVariable('west-db')],
                ['dbServer', new BakeVariable('default-db')]
            ])
            const utils = new CoreUtils(ctx)

            const value = await utils.regionVariable('dbServer')
            expect(value).to.equal('east-db')
        })

        it('regionVariable falls back to non-prefixed variable', async () => {
            const ctx = createContext()
            ctx.Config.variables = new Map([
                ['setting', new BakeVariable('shared-setting')]
            ])
            const utils = new CoreUtils(ctx)

            const value = await utils.regionVariable('setting')
            expect(value).to.equal('shared-setting')
        })

        it('regionVariable uses specified region', async () => {
            const ctx = createContext()
            ctx.Config.variables = new Map([
                ['eus__endpoint', new BakeVariable('east-endpoint')],
                ['wus__endpoint', new BakeVariable('west-endpoint')]
            ])
            const utils = new CoreUtils(ctx)

            const westRegion: IBakeRegion = { name: 'West US', shortName: 'wus', code: 'wus1' }
            const value = await utils.regionVariable('endpoint', 'default', westRegion)
            expect(value).to.equal('west-endpoint')
        })

        it('if_then_variable prefers first key', async () => {
            const ctx = createContext()
            ctx.Config.variables = new Map([
                ['primaryKey', new BakeVariable('primary-value')],
                ['fallbackKey', new BakeVariable('fallback-value')]
            ])
            const utils = new CoreUtils(ctx)

            const value = await utils.if_then_variable('primaryKey', 'fallbackKey', 'default')
            expect(value).to.equal('primary-value')
        })

        it('if_then_variable uses second key when first missing', async () => {
            const ctx = createContext()
            ctx.Config.variables = new Map([
                ['fallbackKey', new BakeVariable('fallback-value')]
            ])
            const utils = new CoreUtils(ctx)

            const value = await utils.if_then_variable('missingKey', 'fallbackKey', 'default')
            expect(value).to.equal('fallback-value')
        })

        it('if_then_variable uses default when both keys missing', async () => {
            const ctx = createContext()
            ctx.Config.variables = new Map()
            const utils = new CoreUtils(ctx)

            const value = await utils.if_then_variable('missing1', 'missing2', 'default')
            expect(value).to.equal('default')
        })
    })

    describe('environment utilities', () => {
        it('is_current_environment_code matches exact environment code', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            expect(utils.is_current_environment_code('dev')).to.equal(true)
            expect(utils.is_current_environment_code('prod')).to.equal(false)
        })

        it('is_current_environment_code is case-sensitive', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            expect(utils.is_current_environment_code('DEV')).to.equal(false)
            expect(utils.is_current_environment_code('Dev')).to.equal(false)
        })
    })

    describe('ingredient utilities', () => {
        it('get_ingredient_source returns source from ingredient', async () => {
            const ingredient: IIngredient = {
                properties: {
                    type: '@azbake/ingredient-utils',
                    source: new BakeVariable('my-custom-source'),
                    parameters: new Map(),
                    tokens: new Map(),
                    alerts: new Map()
                },
                dependsOn: [],
                pluginVersion: '0.0.0'
            }
            const ctx = createContext(undefined, ingredient)
            const utils = new CoreUtils(ctx)

            const source = await utils.get_ingredient_source()
            expect(source).to.equal('my-custom-source')
        })
    })

    describe('edge cases', () => {
        it('handles undefined config variables', async () => {
            const ctx = createContext()
            ;(ctx.Config as any).variables = undefined
            const utils = new CoreUtils(ctx)

            // Should not throw and return default
            const value = await utils.variable('anykey', 'safe-default')
            expect(value).to.equal('safe-default')
        })

        it('handles empty environment code gracefully', () => {
            const ctx = createContext()
            ctx.Environment.environmentCode = ''
            const utils = new CoreUtils(ctx)

            const name = utils.create_resource_name('test', 'app')
            expect(name).to.equal('eus1testapp')
        })

        it('handles special characters in names (lowercased)', () => {
            const ctx = createContext()
            const utils = new CoreUtils(ctx)

            const name = utils.create_resource_name('App', 'Web-API', true, '-v1')
            expect(name).to.equal('deveus1appweb-api-v1')
        })
    })
})
