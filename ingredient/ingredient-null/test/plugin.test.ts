import { expect } from 'chai'
import 'mocha'

import { BakeVariable } from '@azbake/core'
import { DeploymentContext } from '@azbake/core'
import { Logger } from '@azbake/core'
import { IBakeConfig, IBakeEnvironment, IBakePackage, IBakeRegion, IIngredient } from '@azbake/core'

import { NullPlugin } from '../src/plugin'

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
})