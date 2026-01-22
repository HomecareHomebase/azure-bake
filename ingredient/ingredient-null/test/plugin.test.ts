import { expect } from 'chai'
import 'mocha'

import { BakeVariable } from '@azbake/core'
import { DeploymentContext } from '@azbake/core'
import { Logger } from '@azbake/core'
import { IBakeConfig, IBakeEnvironment, IBakePackage, IBakeRegion, IIngredient } from '@azbake/core'

import { NullPlugin } from '../src/plugin'
import { NullUtils } from '../src/functions'

// Require the index module to verify exports (CommonJS)
const nullIndex = require('../src/index')

function createContext(): DeploymentContext {
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
    return new DeploymentContext({} as any, pkg, region, new Logger())
}

describe('ingredient-null', () => {
    it('evaluates each parameter during execution', async () => {
        const originalValueAsync = BakeVariable.prototype.valueAsync
        const calls: string[] = []

        ;(BakeVariable.prototype as any).valueAsync = async function () {
            calls.push(this.Code)
            return this.Code
        }

        try {
            const ctx = createContext()
            const ingredient: IIngredient = {
                properties: {
                    type: '@azbake/ingredient-null',
                    source: new BakeVariable('./src'),
                    parameters: new Map([
                        ['first', new BakeVariable('one')],
                        ['second', new BakeVariable('two')]
                    ]),
                    tokens: new Map(),
                    alerts: new Map()
                },
                dependsOn: [],
                pluginVersion: '0.0.0'
            }

            const plugin = new NullPlugin('null', ingredient, ctx)

            calls.length = 0
            await plugin.Execute()

            expect(calls).deep.eq(['one', 'two'])
        } finally {
            BakeVariable.prototype.valueAsync = originalValueAsync
        }
    })

    it('handles empty parameters map', async () => {
        const ctx = createContext()
        const ingredient: IIngredient = {
            properties: {
                type: '@azbake/ingredient-null',
                source: new BakeVariable('./src'),
                parameters: new Map(),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        const plugin = new NullPlugin('null', ingredient, ctx)

        // Should complete without error
        await plugin.Execute()
    })

    it('evaluates parameters in order', async () => {
        const originalValueAsync = BakeVariable.prototype.valueAsync
        const evaluationOrder: string[] = []

        ;(BakeVariable.prototype as any).valueAsync = async function () {
            evaluationOrder.push(this.Code)
            return this.Code
        }

        try {
            const ctx = createContext()
            const ingredient: IIngredient = {
                properties: {
                    type: '@azbake/ingredient-null',
                    source: new BakeVariable('./src'),
                    parameters: new Map([
                        ['a', new BakeVariable('first')],
                        ['b', new BakeVariable('second')],
                        ['c', new BakeVariable('third')]
                    ]),
                    tokens: new Map(),
                    alerts: new Map()
                },
                dependsOn: [],
                pluginVersion: '0.0.0'
            }

            const plugin = new NullPlugin('null', ingredient, ctx)

            evaluationOrder.length = 0
            await plugin.Execute()

            expect(evaluationOrder).deep.eq(['first', 'second', 'third'])
        } finally {
            BakeVariable.prototype.valueAsync = originalValueAsync
        }
    })
})

describe('ingredient-null functions', () => {
    it('NullUtils extends BaseUtility', () => {
        const ctx = createContext()
        const utils = new NullUtils(ctx)
        
        // NullUtils is an empty class extending BaseUtility
        expect(utils).to.be.instanceOf(NullUtils)
        expect(utils.context).to.equal(ctx)
    })

    it('NullUtils can be instantiated without methods', () => {
        const ctx = createContext()
        const utils = new NullUtils(ctx)
        
        // Verify it has the base class context
        expect(utils).to.not.be.null
    })
})

describe('ingredient-null index exports', () => {
    it('exports plugin', () => {
        expect(nullIndex.plugin).to.equal(NullPlugin)
    })

    it('exports pluginNS', () => {
        expect(nullIndex.pluginNS).to.equal('@azbake/ingredient-null')
    })

    it('plugin can be constructed from export', () => {
        const ctx = createContext()
        const ingredient: IIngredient = {
            properties: {
                type: '@azbake/ingredient-null',
                source: new BakeVariable('./src'),
                parameters: new Map(),
                tokens: new Map(),
                alerts: new Map()
            },
            dependsOn: [],
            pluginVersion: '0.0.0'
        }

        const Plugin = nullIndex.plugin
        const instance = new Plugin('test', ingredient, ctx)
        expect(instance).to.be.instanceOf(NullPlugin)
    })
})