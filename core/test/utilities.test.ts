import { expect } from 'chai'
import 'mocha'

import { BakeVariable } from '../src/bake-variable'
import { BaseIngredient } from '../src/base-ingredient'
import { BaseUtility } from '../src/base-utility'
import { DeploymentContext } from '../src/deployment-context'
import { Logger } from '../src/logger'
import { TagGenerator } from '../src/tag-generator'
import { objToVariableMap } from '../src/utils'
import { IBakeConfig, IBakeEnvironment, IBakePackage, IBakeRegion, IIngredient } from '../src/bake-interfaces'

function createContext(ingredient?: IIngredient): DeploymentContext {
    const config: IBakeConfig = {
        name: 'test',
        shortName: 'tst',
        version: '1.0.0',
        resourceGroup: false,
        recipe: new Map(),
        variables: new Map(),
        owner: 'owner'
    }

    const env: IBakeEnvironment = {
        toolVersion: '0.0.0',
        environmentName: 'env',
        environmentCode: 'code',
        regions: [],
        authentication: {
            subscriptionId: 'sub',
            tenantId: 'tenant',
            serviceId: 'id',
            secretKey: 'key',
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

    const region: IBakeRegion = { name: 'Global', shortName: 'global', code: 'glob' }
    return new DeploymentContext({} as any, pkg, region, new Logger(), ingredient)
}

function createIngredient(typeName: string, pluginVersion: string = ''): IIngredient {
    return {
        properties: {
            type: typeName,
            source: new BakeVariable('./src'),
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion
    }
}

describe('core utilities', () => {
    it('generates tags with extras and ingredient info', () => {
        const ingredient = createIngredient('ingredient-type', '1.2.3')
        const ctx = createContext(ingredient)
        const generator = new TagGenerator(ctx)
        const tags = generator.GenerateTags(new Map([['custom', 'value']]))

        expect(tags.custom).to.equal('value')
        expect(tags.envcode).to.equal('code')
        expect(tags.environment).to.equal('env')
        expect(tags.region).to.equal('Global')
        expect(tags.recipe).to.equal('test')
        expect(tags.package_version).to.equal('1.0.0')
        expect(tags.bake_version).to.equal('0.0.0')
        expect(tags.owner).to.equal('owner')
        expect(tags.ing_version).to.equal('1.2.3')
        expect(tags.ingredient).to.equal('ingredient-type')
        expect(new Date(tags.deployment_ts).toString()).to.not.equal('Invalid Date')
    })

    it('omits ingredient tags when plugin version is missing', () => {
        const ingredient = createIngredient('ingredient-type')
        const ctx = createContext(ingredient)
        const generator = new TagGenerator(ctx)
        const tags = generator.GenerateTags()

        expect(Object.prototype.hasOwnProperty.call(tags, 'ing_version')).to.equal(false)
        expect(Object.prototype.hasOwnProperty.call(tags, 'ingredient')).to.equal(false)
    })

    it('parses resource strings', () => {
        const ctx = createContext()
        const util = new BaseUtility(ctx)

        expect(util.parseResource('rg/name')).to.deep.equal({ resourceGroup: 'rg', resource: 'name' })
        expect(util.parseResource('name')).to.deep.equal({ resourceGroup: '', resource: 'name' })
    })

    it('converts objects into BakeVariable maps', () => {
        const map = objToVariableMap({ foo: 'bar', count: 2 })
        expect(map.size).to.equal(2)
        expect(map.get('foo')).to.be.instanceOf(BakeVariable)
        expect(map.get('foo')?.Code).to.equal('bar')
        expect(map.get('count')?.Code).to.equal(2)

        const emptyMap = objToVariableMap(null)
        expect(emptyMap.size).to.equal(0)
    })

    it('initializes base ingredients without changing behavior', async () => {
        const ingredient = createIngredient('ingredient-type', '1.0.0')
        const ctx = createContext(ingredient)
        const base = new BaseIngredient('alpha', ingredient, ctx) as any

        expect(base._name).to.equal('alpha')
        expect(base._ingredient).to.equal(ingredient)
        await base.Execute()
        const authResult = await base.Auth({} as any)
        expect(authResult).to.equal(null)
    })
})