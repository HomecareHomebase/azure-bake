import { expect } from 'chai'
import 'mocha'

import { BakeVariable } from '../src/bake-variable'
import { BakeEval } from '../src/eval'
import { DeploymentContext } from '../src/deployment-context'
import { Logger } from '../src/logger'
import { IBakeConfig, IBakeEnvironment, IBakePackage, IBakeRegion } from '../src/bake-interfaces'

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

describe('BakeVariable', () => {
    it('returns literal values when no eval is required', async () => {
        const ctx = createContext()
        const variable = new BakeVariable('plain')

        const value = await variable.valueAsync(ctx)
        expect(value).to.equal('plain')
    })

    it('evaluates bracketed expressions and caches compilation', async () => {
        const ctx = createContext()
        const variable = new BakeVariable('[1 + 2]')

        const originalEval = BakeEval.Eval
        let calls = 0
        ;(BakeEval as any).Eval = (v: BakeVariable, c: DeploymentContext) => {
            calls += 1
            return originalEval.call(BakeEval, v, c)
        }

        try {
            const first = await variable.valueAsync(ctx)
            const second = await variable.valueAsync(ctx)

            expect(first).to.equal(3)
            expect(second).to.equal(3)
            expect(calls).to.equal(1)
        } finally {
            ;(BakeEval as any).Eval = originalEval
        }
    })
})