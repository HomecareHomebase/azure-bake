import { expect } from 'chai'
import 'mocha'

import { BakeRunner } from '../src/bake-runner'
import { IngredientFactory } from '../src/ingredients'
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

function createEnvironment(): IBakeEnvironment {
    return {
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
}

function createPackage(recipe: Map<string, IIngredient>): IBakePackage {
    const config: IBakeConfig = {
        name: 'test',
        shortName: 'tst',
        version: '1.0.0',
        resourceGroup: false,
        parallelRegions: true,
        recipe,
        variables: new Map()
    }

    return {
        Config: config,
        Environment: createEnvironment(),
        Authenticate: async () => true
    }
}

function createIngredient(overrides?: Partial<IIngredient>): IIngredient {
    const base: IIngredient = {
        properties: {
            type: 'fixture',
            source: new BakeVariable('./src'),
            parameters: new Map(),
            tokens: new Map(),
            alerts: new Map()
        },
        dependsOn: [],
        pluginVersion: '0.0.0'
    }

    return { ...base, ...overrides }
}

function createContext(pkg: IBakePackage): DeploymentContext {
    const region: IBakeRegion = { name: 'Global', shortName: 'global', code: 'glob' }
    return new DeploymentContext({} as any, pkg, region, new Logger())
}

describe('bake-runner', () => {
    const originalBuild = IngredientFactory.Build

    afterEach(() => {
        IngredientFactory.Build = originalBuild
    })

    it('executes ingredients when dependencies are satisfied', async () => {
        const recipe = new Map<string, IIngredient>()
        recipe.set('alpha', createIngredient())
        recipe.set('beta', createIngredient({ dependsOn: ['alpha'] }))

        const pkg = createPackage(recipe)
        const runner = new BakeRunner(pkg, new Logger())
        const ctx = createContext(pkg)

        const executed: string[] = []
        IngredientFactory.Build = (name: string) => {
            return {
                Execute: async () => {
                    executed.push(name)
                }
            } as any
        }

        const finished: string[] = []
        const hasRemaining = await (runner as any)._executeBakeLoop(['alpha', 'beta'], finished, ctx)
        expect(executed).deep.eq(['alpha'])
        expect(finished).deep.eq(['alpha'])
        expect(hasRemaining).eq(true)

        const hasRemainingAfter = await (runner as any)._executeBakeLoop(['alpha', 'beta'], finished, ctx)
        expect(finished).deep.eq(['alpha', 'beta'])
        expect(hasRemainingAfter).eq(false)
    })

    it('skips ingredients when condition evaluates false', async () => {
        const recipe = new Map<string, IIngredient>()
        recipe.set('alpha', createIngredient({
            properties: {
                ...createIngredient().properties,
                condition: { valueAsync: async () => false } as any
            }
        }))

        const pkg = createPackage(recipe)
        const runner = new BakeRunner(pkg, new Logger())
        const ctx = createContext(pkg)

        const executed: string[] = []
        IngredientFactory.Build = (name: string) => {
            return {
                Execute: async () => {
                    executed.push(name)
                }
            } as any
        }

        const finished: string[] = []
        const hasRemaining = await (runner as any)._executeBakeLoop(['alpha'], finished, ctx)
        expect(executed).deep.eq([])
        expect(finished).deep.eq(['alpha'])
        expect(hasRemaining).eq(false)
    })

    it('ignores execution errors when ignoreErrors is true', async () => {
        const recipe = new Map<string, IIngredient>()
        recipe.set('alpha', createIngredient({
            properties: {
                ...createIngredient().properties,
                ignoreErrors: true
            }
        }))

        const pkg = createPackage(recipe)
        const runner = new BakeRunner(pkg, new Logger())
        const ctx = createContext(pkg)

        IngredientFactory.Build = () => {
            return {
                Execute: async () => {
                    throw new Error('boom')
                }
            } as any
        }

        const finished: string[] = []
        await (runner as any)._executeBakeLoop(['alpha'], finished, ctx)
        expect(finished).deep.eq(['alpha'])
    })

    it('runs regions in parallel when configured', async () => {
        const recipe = new Map<string, IIngredient>()
        recipe.set('alpha', createIngredient())

        const pkg = createPackage(recipe)
        pkg.Config.parallelRegions = true
        const runner = new BakeRunner(pkg, new Logger())

        const started: string[] = []
        const resolvers: Array<() => void> = []
        ;(runner as any)._bakeRegion = (ctx: DeploymentContext) => {
            started.push(ctx.Region.name)
            return new Promise<boolean>((resolve) => {
                resolvers.push(() => resolve(true))
            })
        }

        const regions: IBakeRegion[] = [
            { name: 'East', shortName: 'east', code: 'e' },
            { name: 'West', shortName: 'west', code: 'w' }
        ]

        const bakePromise = runner.bake(regions)
        await new Promise((resolve) => setImmediate(resolve))

        expect(started).deep.eq(['East', 'West'])

        resolvers.forEach((resolve) => resolve())
        await bakePromise
    })

    it('runs regions sequentially when parallel disabled', async () => {
        const recipe = new Map<string, IIngredient>()
        recipe.set('alpha', createIngredient())

        const pkg = createPackage(recipe)
        pkg.Config.parallelRegions = false
        const runner = new BakeRunner(pkg, new Logger())

        const started: string[] = []
        let firstResolve: (() => void) | null = null

        ;(runner as any)._bakeRegion = (ctx: DeploymentContext) => {
            started.push(ctx.Region.name)
            if (!firstResolve) {
                return new Promise<boolean>((resolve) => {
                    firstResolve = () => resolve(true)
                })
            }
            return Promise.resolve(true)
        }

        const regions: IBakeRegion[] = [
            { name: 'East', shortName: 'east', code: 'e' },
            { name: 'West', shortName: 'west', code: 'w' }
        ]

        const bakePromise = runner.bake(regions)
        await new Promise((resolve) => setImmediate(resolve))

        expect(started).deep.eq(['East'])

        if (firstResolve) {
            (firstResolve as () => void)()
        }

        await new Promise((resolve) => setImmediate(resolve))
        expect(started).deep.eq(['East', 'West'])

        await bakePromise
    })

    it('throws when a parallel region fails', async () => {
        const recipe = new Map<string, IIngredient>()
        recipe.set('alpha', createIngredient())

        const pkg = createPackage(recipe)
        pkg.Config.parallelRegions = true
        const runner = new BakeRunner(pkg, new Logger())

        ;(runner as any)._bakeRegion = async (ctx: DeploymentContext) => {
            return ctx.Region.code !== 'fail'
        }

        const regions: IBakeRegion[] = [
            { name: 'Good', shortName: 'good', code: 'ok' },
            { name: 'Bad', shortName: 'bad', code: 'fail' }
        ]

        let error: Error | null = null
        try {
            await runner.bake(regions)
        } catch (err: any) {
            error = err
        }

        expect(error).not.eq(null)
        expect(error?.message).to.contain('Not all regions deployed successfully')
    })

    it('throws when a sequential region fails', async () => {
        const recipe = new Map<string, IIngredient>()
        recipe.set('alpha', createIngredient())

        const pkg = createPackage(recipe)
        pkg.Config.parallelRegions = false
        const runner = new BakeRunner(pkg, new Logger())

        let calls = 0
        ;(runner as any)._bakeRegion = async () => {
            calls += 1
            return false
        }

        const regions: IBakeRegion[] = [
            { name: 'Bad', shortName: 'bad', code: 'fail' },
            { name: 'Never', shortName: 'never', code: 'never' }
        ]

        let error: Error | null = null
        try {
            await runner.bake(regions)
        } catch (err: any) {
            error = err
        }

        expect(calls).eq(1)
        expect(error).not.eq(null)
        expect(error?.message).to.contain('Not all regions deployed successfully')
    })
})