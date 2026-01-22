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

describe('BakeEval', () => {
    it('returns null for non-expression values', () => {
        const ctx = createContext()
        const variable = new BakeVariable('plain')
        const compiled = BakeEval.Eval(variable, ctx)
        expect(compiled).eq(null)
    })

        it('returns null when value starts with [ but does not end with ]', () => {
            const ctx = createContext()
            const variable = new BakeVariable('[incomplete expression')
            const compiled = BakeEval.Eval(variable, ctx)
            expect(compiled).eq(null)
        })

        it('returns null when value ends with ] but does not start with [', () => {
            const ctx = createContext()
            const variable = new BakeVariable('incomplete expression]')
            const compiled = BakeEval.Eval(variable, ctx)
            expect(compiled).eq(null)
        })

        it('handles whitespace around expressions', () => {
            const ctx = createContext()
            const variable = new BakeVariable('  [2 * 3]  ')
            const compiled = BakeEval.Eval(variable, ctx)
            expect(compiled).not.eq(null)

            const resultWrapper = (compiled as Function)(ctx, () => null)
            return resultWrapper().then((value: number) => {
                expect(value).eq(6)
            })
        })

            it('handles async expressions', async () => {
                const ctx = createContext()
                const variable = new BakeVariable('[Promise.resolve(42)]')
                const compiled = BakeEval.Eval(variable, ctx)
                expect(compiled).not.eq(null)

                const resultWrapper = (compiled as Function)(ctx, () => null)
                const value = await resultWrapper()
                expect(value).eq(42)
            })

            it('handles context access in expressions', async () => {
                const ctx = createContext()
                const variable = new BakeVariable('[ctx.Region.name]')
                const compiled = BakeEval.Eval(variable, ctx)
                expect(compiled).not.eq(null)

                const resultWrapper = (compiled as Function)(ctx, () => null)
                const value = await resultWrapper()
                expect(value).eq('Global')
            })

    it('evaluates bracketed expressions', async () => {
        const ctx = createContext()
        const variable = new BakeVariable('[1 + 1]')
        const compiled = BakeEval.Eval(variable, ctx)
        expect(compiled).not.eq(null)

        const resultWrapper = (compiled as Function)(ctx, () => null)
        const value = await resultWrapper()
        expect(value).eq(2)
    })

    it('falls back to literal on compile errors', async () => {
        const ctx = createContext()
        const variable = new BakeVariable('[not valid]')
        const value = await variable.valueAsync(ctx)
        expect(value).eq('[not valid]')
    })
})