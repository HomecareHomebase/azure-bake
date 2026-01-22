import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

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
    Logger,
    IngredientManager
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
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        IngredientFactory.Build = originalBuild
        sandbox.restore()
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

    describe('login', () => {
        it('returns true when skipAuth is enabled', async () => {
            const recipe = new Map<string, IIngredient>()
            const pkg = createPackage(recipe)
            pkg.Environment.authentication.skipAuth = true

            const runner = new BakeRunner(pkg, new Logger())

            // Mock _loadBuiltIns to prevent actual registration
            const originalRegister = IngredientManager.Register
            IngredientManager.Register = (() => {}) as any

            try {
                const result = await runner.login()
                expect(result).eq(true)
            } finally {
                IngredientManager.Register = originalRegister
            }
        })

        it('returns result from Authenticate callback', async () => {
            const recipe = new Map<string, IIngredient>()
            const pkg = createPackage(recipe)
            pkg.Environment.authentication.skipAuth = true
            let authCallbackCalled = false
            pkg.Authenticate = async (callback) => {
                authCallbackCalled = true
                return await callback(pkg.Environment.authentication)
            }

            const runner = new BakeRunner(pkg, new Logger())

            const originalRegister = IngredientManager.Register
            IngredientManager.Register = (() => {}) as any

            try {
                const result = await runner.login()
                expect(authCallbackCalled).eq(true)
                expect(result).eq(true)
            } finally {
                IngredientManager.Register = originalRegister
            }
        })
    })

    describe('_executeBakeLoop edge cases', () => {
        it('handles condition that throws with ignoreErrors true', async () => {
            const recipe = new Map<string, IIngredient>()
            recipe.set('alpha', createIngredient({
                properties: {
                    ...createIngredient().properties,
                    condition: { 
                        valueAsync: async () => { 
                            throw new Error('condition error') 
                        } 
                    } as any,
                    ignoreErrors: true
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
            // Should not throw - error is ignored
            const hasRemaining = await (runner as any)._executeBakeLoop(['alpha'], finished, ctx)
            expect(executed).deep.eq([])
            expect(finished).deep.eq(['alpha'])
            expect(hasRemaining).eq(false)
        })

        it('handles condition that throws with ignoreErrors false', async () => {
            const recipe = new Map<string, IIngredient>()
            recipe.set('alpha', createIngredient({
                properties: {
                    ...createIngredient().properties,
                    condition: { 
                        valueAsync: async () => { 
                            throw new Error('condition error') 
                        } 
                    } as any,
                    ignoreErrors: false
                }
            }))

            const pkg = createPackage(recipe)
            const runner = new BakeRunner(pkg, new Logger())
            const ctx = createContext(pkg)

            IngredientFactory.Build = () => {
                return {
                    Execute: async () => {}
                } as any
            }

            const finished: string[] = []
            // Should throw due to foundErrors = true
            let error: Error | null = null
            try {
                await (runner as any)._executeBakeLoop(['alpha'], finished, ctx)
            } catch (e: any) {
                error = e
            }
            expect(error).to.not.be.null
        })

        it('logs error when ingredient type is not found', async () => {
            const recipe = new Map<string, IIngredient>()
            recipe.set('alpha', createIngredient())

            const pkg = createPackage(recipe)
            const runner = new BakeRunner(pkg, new Logger())
            const ctx = createContext(pkg)

            // Return null to simulate missing ingredient
            IngredientFactory.Build = () => null

            const finished: string[] = []
            let error: Error | null = null
            try {
                await (runner as any)._executeBakeLoop(['alpha'], finished, ctx)
            } catch (e: any) {
                error = e
            }

            expect(error).to.not.be.null
            expect(finished).deep.eq(['alpha'])
        })

        it('throws error when execution fails without ignoreErrors', async () => {
            const recipe = new Map<string, IIngredient>()
            recipe.set('alpha', createIngredient({
                properties: {
                    ...createIngredient().properties,
                    ignoreErrors: false
                }
            }))

            const pkg = createPackage(recipe)
            const runner = new BakeRunner(pkg, new Logger())
            const ctx = createContext(pkg)

            IngredientFactory.Build = () => {
                return {
                    Execute: async () => {
                        throw new Error('execution failed')
                    }
                } as any
            }

            const finished: string[] = []
            let error: Error | null = null
            try {
                await (runner as any)._executeBakeLoop(['alpha'], finished, ctx)
            } catch (e: any) {
                error = e
            }

            expect(error).to.not.be.null
        })

        it('skips already finished ingredients', async () => {
            const recipe = new Map<string, IIngredient>()
            recipe.set('alpha', createIngredient())

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

            // Ingredient already in finished list
            const finished: string[] = ['alpha']
            const hasRemaining = await (runner as any)._executeBakeLoop(['alpha'], finished, ctx)
            expect(executed).deep.eq([])
            expect(hasRemaining).eq(false)
        })

        it('waits for all dependencies before executing', async () => {
            const recipe = new Map<string, IIngredient>()
            recipe.set('alpha', createIngredient())
            recipe.set('beta', createIngredient())
            recipe.set('gamma', createIngredient({ dependsOn: ['alpha', 'beta'] }))

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

            // Only alpha is finished
            const finished: string[] = ['alpha']
            const hasRemaining = await (runner as any)._executeBakeLoop(['alpha', 'beta', 'gamma'], finished, ctx)
            
            // beta should execute, gamma should wait
            expect(executed).to.include('beta')
            expect(executed).to.not.include('gamma')
            expect(hasRemaining).eq(true)
        })

        it('passes customAuthToken to context when set', async () => {
            const recipe = new Map<string, IIngredient>()
            recipe.set('alpha', createIngredient())

            const pkg = createPackage(recipe)
            const runner = new BakeRunner(pkg, new Logger())
            
            // Set a custom auth token
            ;(runner as any)._customAuthToken.set('alpha', 'custom-token-123')
            
            const ctx = createContext(pkg)

            let receivedToken: string | null = null
            IngredientFactory.Build = (name: string, ingredient: IIngredient, buildCtx: DeploymentContext) => {
                receivedToken = buildCtx.CustomAuthToken
                return {
                    Execute: async () => {}
                } as any
            }

            const finished: string[] = []
            await (runner as any)._executeBakeLoop(['alpha'], finished, ctx)
            
            expect(receivedToken).eq('custom-token-123')
        })

        it('executes condition that evaluates to true', async () => {
            const recipe = new Map<string, IIngredient>()
            recipe.set('alpha', createIngredient({
                properties: {
                    ...createIngredient().properties,
                    condition: { valueAsync: async () => true } as any
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
            await (runner as any)._executeBakeLoop(['alpha'], finished, ctx)
            
            // Ingredient should execute when condition is true
            expect(executed).deep.eq(['alpha'])
        })
    })

    describe('bake parallel edge cases', () => {
        it('catches Promise.all rejection in parallel mode', async () => {
            const recipe = new Map<string, IIngredient>()
            recipe.set('alpha', createIngredient())

            const pkg = createPackage(recipe)
            pkg.Config.parallelRegions = true
            const runner = new BakeRunner(pkg, new Logger())

            ;(runner as any)._bakeRegion = async () => {
                throw new Error('region explosion')
            }

            const regions: IBakeRegion[] = [
                { name: 'Boom', shortName: 'boom', code: 'boom' }
            ]

            let error: Error | null = null
            try {
                await runner.bake(regions)
            } catch (err: any) {
                error = err
            }

            expect(error).to.not.be.null
            expect(error?.message).to.contain('Not all regions deployed successfully')
        })

        it('propagates error in sequential mode', async () => {
            const recipe = new Map<string, IIngredient>()
            recipe.set('alpha', createIngredient())

            const pkg = createPackage(recipe)
            pkg.Config.parallelRegions = false
            const runner = new BakeRunner(pkg, new Logger())

            const thrownError = new Error('sequential boom')
            ;(runner as any)._bakeRegion = async () => {
                throw thrownError
            }

            const regions: IBakeRegion[] = [
                { name: 'Boom', shortName: 'boom', code: 'boom' }
            ]

            let error: Error | null = null
            try {
                await runner.bake(regions)
            } catch (err: any) {
                error = err
            }

            expect(error).to.eq(thrownError)
        })
    })

    describe('constructor', () => {
        it('uses default logger when none provided', () => {
            const recipe = new Map<string, IIngredient>()
            const pkg = createPackage(recipe)
            
            const runner = new BakeRunner(pkg)
            
            expect((runner as any)._logger).to.not.be.null
        })

        it('uses provided logger', () => {
            const recipe = new Map<string, IIngredient>()
            const pkg = createPackage(recipe)
            const customLogger = new Logger(['custom'], 'debug')
            
            const runner = new BakeRunner(pkg, customLogger)
            
            expect((runner as any)._logger).to.eq(customLogger)
        })
    })
})