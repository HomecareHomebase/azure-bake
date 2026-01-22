import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import { CoreUtils } from '../src/functions'
import {
    BakeVariable,
    DeploymentContext,
    IBakeConfig,
    IBakeEnvironment,
    IBakePackage,
    IBakeRegion,
    IIngredient,
    Logger
} from '@azbake/core'

function createContext(region: IBakeRegion): DeploymentContext {
    const config: IBakeConfig = {
        name: 'test',
        shortName: 'pkg',
        version: '1.0.0',
        resourceGroup: false,
        recipe: new Map(),
        variables: new Map()
    }

    const env: IBakeEnvironment = {
        toolVersion: '0.0.0',
        environmentName: 'Dev',
        environmentCode: 'dev',
        regions: [
            { name: 'East', shortName: 'east', code: 'eus' },
            { name: 'West', shortName: 'west', code: 'wus' }
        ],
        authentication: {
            subscriptionId: 'sub',
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

    const ingredient: IIngredient = {
        properties: {
            type: '@azbake/ingredient-utils',
            source: new BakeVariable('source'),
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }

    return new DeploymentContext({} as any, pkg, region, new Logger(), ingredient)
}

describe('ingredient-utils core helpers', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    it('detects the primary region', () => {
        const primaryContext = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const primaryUtils = new CoreUtils(primaryContext)

        expect(primaryUtils.current_region_primary()).to.eq(true)

        const secondaryContext = createContext({ name: 'West', shortName: 'west', code: 'wus' })
        const secondaryUtils = new CoreUtils(secondaryContext)

        expect(secondaryUtils.current_region_primary()).to.eq(false)
    })

    it('formats resource group names deterministically', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        const rg = await utils.resource_group('app')
        expect(rg).to.equal('RG_APP_EUS_DEV')
    })

    it('converts primitive helpers and flags', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.toNumber('0042')).to.equal(42)
        expect(utils.toString(123)).to.equal('123')
        expect(utils.toBoolean('true')).to.equal(true)
        expect(utils.toBoolean('1')).to.equal(true)
        expect(utils.toBoolean('false')).to.equal(false)
        expect(utils.toJsonString({ a: 1 })).to.equal('{"a":1}')
        expect(utils.is_current_environment_code('dev')).to.equal(true)
        expect(utils.is_current_environment_code('prod')).to.equal(false)
    })

    it('resolves primary, secondary, and current regions', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.current_region()).to.deep.equal({ name: 'East', shortName: 'east', code: 'eus' })
        expect(utils.primary_region()).to.deep.equal({ name: 'East', shortName: 'east', code: 'eus' })
        expect(utils.secondary_region()).to.deep.equal({ name: 'West', shortName: 'west', code: 'wus' })

        ctx.Environment.regions = [{ name: 'Solo', shortName: 'solo', code: 'sol' }]
        expect(utils.secondary_region()).to.deep.equal({ name: 'Solo', shortName: 'solo', code: 'sol' })
    })

    it('resolves variables by region and case-insensitive keys', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.variables = new Map([
            ['Foo', new BakeVariable('bar')],
            ['east__color', new BakeVariable('blue')],
            ['west__color', new BakeVariable('green')],
            ['fallback', new BakeVariable('fallback')]
        ])

        const utils = new CoreUtils(ctx)
        expect(await utils.variable('foo', 'default')).to.equal('bar')
        expect(await utils.variable('missing', 'default')).to.equal('default')
        expect(await utils.regionVariable('color', 'default')).to.equal('blue')
        expect(
            await utils.regionVariable('color', 'default', { name: 'West', shortName: 'west', code: 'wus' })
        ).to.equal('green')
        expect(await utils.if_then_variable('missing', 'fallback', 'default')).to.equal('fallback')
    })

    it('builds resource names and identifiers consistently', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.create_resource_name('app', 'svc', true, '01')).to.equal('deveusappsvc01')
        expect(utils.create_resource_name('app', 'svc', false, '01')).to.equal('devappsvc01')
        expect(
            utils.create_region_resource_name('app', 'svc', { name: 'West', shortName: 'west', code: 'wus' }, '02')
        ).to.equal('devwusappsvc02')

        expect(utils.create_storage_name('data')).to.equal('deveusstdata')
        expect(utils.create_app_svc_name()).to.equal('deveusappsvcpkg')

        expect(utils.get_resource_group('web', true)).to.equal('RG_WEB_EUS_DEV')
        expect(utils.get_resource_group('web', false)).to.equal('RG_WEB_DEV')
        expect(utils.get_app_svc_name('web')).to.equal('RG_WEB_EUS_DEV/deveusappsvcweb')
        expect(utils.get_cert_name('web')).to.equal('RG_WEB_EUS_DEV/deveuscertweb')

        expect(await utils.get_ingredient_source()).to.equal('source')
        expect(await utils.resource_group('override', true, null, true)).to.equal('RG_OVERRIDE_EUS_DEV')
    })

    it('prefers rgOverride when configured', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.rgOverride = new BakeVariable('RG_OVERRIDE')
        const utils = new CoreUtils(ctx)

        expect(await utils.resource_group()).to.equal('RG_OVERRIDE')
        expect(await utils.resource_group('ignored', true, null, true)).to.equal('RG_IGNORED_EUS_DEV')
    })

    it('returns false for primary when no regions configured', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Environment.regions = []
        const utils = new CoreUtils(ctx)

        expect(utils.current_region_primary()).to.eq(false)
    })

    it('returns null for primary_region when no regions configured', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Environment.regions = []
        const utils = new CoreUtils(ctx)

        expect(utils.primary_region()).to.eq(null)
    })

    it('returns null for secondary_region when no regions configured', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Environment.regions = []
        const utils = new CoreUtils(ctx)

        expect(utils.secondary_region()).to.eq(null)
    })

    it('toNumber handles numeric strings with leading zeros', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.toNumber('0001')).to.equal(1)
        expect(utils.toNumber('007')).to.equal(7)
        expect(utils.toNumber('100')).to.equal(100)
    })

    it('toNumber handles actual numbers', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.toNumber(42)).to.equal(42)
        expect(utils.toNumber(0)).to.equal(0)
    })

    it('toString handles various types', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.toString(0)).to.equal('0')
        expect(utils.toString(true)).to.equal('true')
        expect(utils.toString(false)).to.equal('false')
        expect(utils.toString('hello')).to.equal('hello')
    })

    it('toBoolean handles various falsy values', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.toBoolean('false')).to.equal(false)
        expect(utils.toBoolean('FALSE')).to.equal(false)
        expect(utils.toBoolean('False')).to.equal(false)
        expect(utils.toBoolean('0')).to.equal(false)
        expect(utils.toBoolean(0)).to.equal(false)
        expect(utils.toBoolean('no')).to.equal(false)
        expect(utils.toBoolean('')).to.equal(false)
    })

    it('toBoolean handles various truthy values', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.toBoolean('true')).to.equal(true)
        expect(utils.toBoolean('TRUE')).to.equal(true)
        expect(utils.toBoolean('True')).to.equal(true)
        expect(utils.toBoolean('1')).to.equal(true)
        expect(utils.toBoolean(1)).to.equal(true)
    })

    it('toJsonString handles arrays and nested objects', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.toJsonString([1, 2, 3])).to.equal('[1,2,3]')
        expect(utils.toJsonString({ nested: { value: 'deep' } })).to.equal('{"nested":{"value":"deep"}}')
        expect(utils.toJsonString(null)).to.equal('null')
    })

    it('resource_group uses region code when region parameter is provided', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        const rg = await utils.resource_group('app', true, { name: 'West', shortName: 'west', code: 'wus' })
        expect(rg).to.equal('RG_APP_WUS_DEV')
    })

    it('resource_group omits region code when useRegionCode is false', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        const rg = await utils.resource_group('app', false)
        expect(rg).to.equal('RG_APP_DEV')
    })

    it('resource_group uses package shortName when name is null', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        const rg = await utils.resource_group(null, true)
        expect(rg).to.equal('RG_PKG_EUS_DEV')
    })

    it('create_region_resource_name handles null region', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        const name = utils.create_region_resource_name('app', 'svc', null, '01')
        expect(name).to.equal('devappsvc01')
    })

    it('create_resource_name uses package shortName when name is null', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        const name = utils.create_resource_name('app', null, true, '01')
        expect(name).to.equal('deveusapppkg01')
    })

    it('create_storage_name generates correct storage account name', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.create_storage_name('logs', '01')).to.equal('deveusstlogs01')
        expect(utils.create_storage_name(null, '')).to.equal('deveusstpkg')
    })

    it('create_cert_name generates certificate name', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.create_cert_name()).to.equal('deveuscertpkg')
    })

    it('get_cert_name with custom resource group', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.get_cert_name('web', 'CUSTOM_RG')).to.equal('CUSTOM_RG/deveuscertweb')
    })

    it('get_app_svc_name with custom resource group', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.get_app_svc_name('web', 'CUSTOM_RG')).to.equal('CUSTOM_RG/deveusappsvcweb')
    })

    it('variable returns empty string when no default and variable missing', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.variables = new Map()
        const utils = new CoreUtils(ctx)

        expect(await utils.variable('nonexistent')).to.equal('')
    })

    it('variable resolves case-insensitively', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.variables = new Map([
            ['MyVariable', new BakeVariable('found')]
        ])
        const utils = new CoreUtils(ctx)

        expect(await utils.variable('myvariable')).to.equal('found')
        expect(await utils.variable('MYVARIABLE')).to.equal('found')
        expect(await utils.variable('MyVariable')).to.equal('found')
    })

    it('regionVariable falls back to non-prefixed key', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.variables = new Map([
            ['color', new BakeVariable('fallback-color')]
        ])
        const utils = new CoreUtils(ctx)

        expect(await utils.regionVariable('color')).to.equal('fallback-color')
    })

    it('regionVariable falls back to default when neither exists', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.variables = new Map()
        const utils = new CoreUtils(ctx)

        expect(await utils.regionVariable('missing', 'default-val')).to.equal('default-val')
    })

    it('regionVariable returns empty string when no default', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.variables = new Map()
        const utils = new CoreUtils(ctx)

        expect(await utils.regionVariable('missing')).to.equal('')
    })

    it('if_then_variable uses first key when both exist', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.variables = new Map([
            ['primary', new BakeVariable('primary-value')],
            ['secondary', new BakeVariable('secondary-value')]
        ])
        const utils = new CoreUtils(ctx)

        expect(await utils.if_then_variable('primary', 'secondary', 'default')).to.equal('primary-value')
    })

    it('if_then_variable falls back to default when both missing', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.variables = new Map()
        const utils = new CoreUtils(ctx)

        expect(await utils.if_then_variable('missing1', 'missing2', 'default-value')).to.equal('default-value')
    })

    it('if_then_variable returns empty when no default and both missing', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.variables = new Map()
        const utils = new CoreUtils(ctx)

        expect(await utils.if_then_variable('missing1', 'missing2')).to.equal('')
    })

    it('is_current_environment_code is case sensitive', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        expect(utils.is_current_environment_code('dev')).to.equal(true)
        expect(utils.is_current_environment_code('DEV')).to.equal(false)
        expect(utils.is_current_environment_code('Dev')).to.equal(false)
    })

    it('handles undefined config variables gracefully', async () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ;(ctx.Config as any).variables = undefined
        const utils = new CoreUtils(ctx)

        expect(await utils.variable('anykey', 'default')).to.equal('default')
    })

    it('create_resource_name generates lowercase names', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        ctx.Config.shortName = 'UPPERCASE'
        const utils = new CoreUtils(ctx)

        const name = utils.create_resource_name('APP', 'SVC', true, '01')
        expect(name).to.equal('deveusappsvc01')
    })

    it('get_resource_group generates uppercase names', () => {
        const ctx = createContext({ name: 'East', shortName: 'east', code: 'eus' })
        const utils = new CoreUtils(ctx)

        const rg = utils.get_resource_group('lowercase', true)
        expect(rg).to.equal('RG_LOWERCASE_EUS_DEV')
    })
})