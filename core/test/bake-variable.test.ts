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
        describe('Code getter', () => {
            it('returns empty string when value is null', () => {
                const variable = new BakeVariable()
                ;(variable as any)._value = null
                expect(variable.Code).to.equal('')
            })

            it('returns empty string when value is undefined', () => {
                const variable = new BakeVariable()
                expect(variable.Code).to.equal('')
            })

            it('returns the value when value is defined', () => {
                const variable = new BakeVariable('test-value')
                expect(variable.Code).to.equal('test-value')
            })

            it('returns numeric values as-is', () => {
                const variable = new BakeVariable()
                ;(variable as any)._value = 42
                expect(variable.Code).to.equal(42)
            })

            it('returns boolean values as-is', () => {
                const variable = new BakeVariable()
                ;(variable as any)._value = false
                expect(variable.Code).to.equal(false)
            })
        })

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

        it('returns Code directly when _compiled is already set to null', async () => {
            const ctx = createContext()
            const variable = new BakeVariable('literal-value')
        
            // Pre-set _compiled to null to simulate already-evaluated non-expression
            ;(variable as any)._compiled = null

            const value = await variable.valueAsync(ctx)
            expect(value).to.equal('literal-value')
        })

        it('reuses existing compiled function without re-evaluating', async () => {
            const ctx = createContext()
            const variable = new BakeVariable('[5 + 5]')

            // First call compiles
            const first = await variable.valueAsync(ctx)
            expect(first).to.equal(10)
        
            // Verify _compiled is now set
            expect((variable as any)._compiled).to.not.equal(undefined)
            expect((variable as any)._compiled).to.not.equal(null)

            // Second call should reuse the compiled function
            const second = await variable.valueAsync(ctx)
            expect(second).to.equal(10)
        })

        it('handles string expressions with context access', async () => {
            const ctx = createContext()
            const variable = new BakeVariable('["hello" + " world"]')

            const value = await variable.valueAsync(ctx)
            expect(value).to.equal('hello world')
        })
})