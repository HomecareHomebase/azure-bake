import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import { 
    CredentialFactory, 
    CredentialFactoryError, 
    BakeCredentials,
    isModernCredential, 
    isLegacyCredential 
} from '../src/credential-factory'
import { IBakeAuthentication } from '../src/bake-interfaces'
import { Logger } from '../src/logger'

function createAuth(overrides?: Partial<IBakeAuthentication>): IBakeAuthentication {
    return {
        subscriptionId: 'test-subscription-id',
        tenantId: 'test-tenant-id',
        serviceId: 'test-service-id',
        secretKey: 'test-secret-key',
        certPath: '',
        skipAuth: false,
        ...overrides
    }
}

describe('CredentialFactory', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('constructor', () => {
        it('creates factory with default options', () => {
            const factory = new CredentialFactory()
            expect(factory).to.be.instanceOf(CredentialFactory)
        })

        it('creates factory with custom logger', () => {
            const logger = new Logger(['test'], 'debug')
            const factory = new CredentialFactory({ logger })
            expect(factory).to.be.instanceOf(CredentialFactory)
        })
    })

    describe('createCredentials', () => {
        describe('when skipAuth is true', () => {
            it('returns placeholder credentials without calling Azure', async () => {
                const factory = new CredentialFactory()
                const auth = createAuth({ skipAuth: true })

                const result = await factory.createCredentials(auth)

                expect(result).to.have.property('legacyCredentials')
                expect(result).to.have.property('modernCredentials')
                expect(result.tenantId).to.equal('test-tenant-id')
                expect(result.subscriptionId).to.equal('test-subscription-id')
            })

            it('returns credentials with getToken method', async () => {
                const factory = new CredentialFactory()
                const auth = createAuth({ skipAuth: true })

                const result = await factory.createCredentials(auth)

                expect(result.legacyCredentials).to.have.property('getToken')
                expect(typeof result.legacyCredentials.getToken).to.equal('function')
            })

            it('getToken returns a valid token structure', async () => {
                const factory = new CredentialFactory()
                const auth = createAuth({ skipAuth: true })

                const result = await factory.createCredentials(auth)
                const token = await result.legacyCredentials.getToken()

                expect(token).to.have.property('token')
                expect(token.token).to.equal('skipped-auth-token')
            })

            it('uses default values when auth fields are empty', async () => {
                const factory = new CredentialFactory()
                const auth = createAuth({ 
                    skipAuth: true,
                    tenantId: '',
                    subscriptionId: ''
                })

                const result = await factory.createCredentials(auth)

                expect(result.tenantId).to.equal('skipped-tenant')
                expect(result.subscriptionId).to.equal('skipped-subscription')
            })

            it('respects skipAuth in options over auth config', async () => {
                const factory = new CredentialFactory()
                const auth = createAuth({ skipAuth: false })

                // skipAuth in options should take precedence
                const result = await factory.createCredentials(auth, { skipAuth: true })

                // Should get placeholder credentials
                const token = await result.legacyCredentials.getToken()
                expect(token.token).to.equal('skipped-auth-token')
            })
        })

        describe('validation', () => {
            it('throws CredentialFactoryError when tenantId is missing', async () => {
                const factory = new CredentialFactory()
                const auth = createAuth({ tenantId: '', skipAuth: false })

                try {
                    await factory.createCredentials(auth)
                    expect.fail('Should have thrown')
                } catch (error: any) {
                    expect(error).to.be.instanceOf(CredentialFactoryError)
                    expect(error.message).to.contain('tenantId')
                }
            })

            it('throws CredentialFactoryError when serviceId is missing', async () => {
                const factory = new CredentialFactory()
                const auth = createAuth({ serviceId: '', skipAuth: false })

                try {
                    await factory.createCredentials(auth)
                    expect.fail('Should have thrown')
                } catch (error: any) {
                    expect(error).to.be.instanceOf(CredentialFactoryError)
                    expect(error.message).to.contain('serviceId')
                }
            })

            it('throws CredentialFactoryError when secretKey is missing', async () => {
                const factory = new CredentialFactory()
                const auth = createAuth({ secretKey: '', skipAuth: false })

                try {
                    await factory.createCredentials(auth)
                    expect.fail('Should have thrown')
                } catch (error: any) {
                    expect(error).to.be.instanceOf(CredentialFactoryError)
                    expect(error.message).to.contain('secretKey')
                }
            })

            it('throws CredentialFactoryError when subscriptionId is missing', async () => {
                const factory = new CredentialFactory()
                const auth = createAuth({ subscriptionId: '', skipAuth: false })

                try {
                    await factory.createCredentials(auth)
                    expect.fail('Should have thrown')
                } catch (error: any) {
                    expect(error).to.be.instanceOf(CredentialFactoryError)
                    expect(error.message).to.contain('subscriptionId')
                }
            })

            it('lists all missing parameters in error message', async () => {
                const factory = new CredentialFactory()
                const auth: IBakeAuthentication = {
                    subscriptionId: '',
                    tenantId: '',
                    serviceId: '',
                    secretKey: '',
                    certPath: '',
                    skipAuth: false
                }

                try {
                    await factory.createCredentials(auth)
                    expect.fail('Should have thrown')
                } catch (error: any) {
                    expect(error).to.be.instanceOf(CredentialFactoryError)
                    expect(error.message).to.contain('tenantId')
                    expect(error.message).to.contain('serviceId')
                    expect(error.message).to.contain('secretKey')
                    expect(error.message).to.contain('subscriptionId')
                }
            })
        })

        describe('logging', () => {
            it('logs skip message when skipAuth is true', async () => {
                const logger = new Logger()
                const logSpy = sandbox.spy(logger, 'log')
                const factory = new CredentialFactory({ logger })
                const auth = createAuth({ skipAuth: true })

                await factory.createCredentials(auth)

                expect(logSpy.calledWith('Skipping Azure authentication (skipAuth=true)')).to.be.true
            })
        })
    })

    describe('validateCredentials', () => {
        it('returns true for skipped credentials', async () => {
            const factory = new CredentialFactory()
            const auth = createAuth({ skipAuth: true })
            const credentials = await factory.createCredentials(auth)

            const result = await factory.validateCredentials(credentials)

            expect(result).to.be.true
        })

        it('returns true when modern credentials getToken succeeds', async () => {
            const factory = new CredentialFactory()
            const mockCredentials: BakeCredentials = {
                legacyCredentials: null,
                modernCredentials: {
                    getToken: async () => ({ token: 'valid-token', expiresOnTimestamp: Date.now() + 3600000 })
                },
                tenantId: 'test',
                subscriptionId: 'test'
            }

            const result = await factory.validateCredentials(mockCredentials)

            expect(result).to.be.true
        })

        it('throws when modern credentials getToken returns empty', async () => {
            const factory = new CredentialFactory()
            const mockCredentials: BakeCredentials = {
                legacyCredentials: null,
                modernCredentials: {
                    getToken: async () => null
                },
                tenantId: 'test',
                subscriptionId: 'test'
            }

            try {
                await factory.validateCredentials(mockCredentials)
                expect.fail('Should have thrown')
            } catch (error: any) {
                expect(error).to.be.instanceOf(CredentialFactoryError)
                expect(error.message).to.contain('empty result')
            }
        })

        it('throws when modern credentials getToken throws', async () => {
            const factory = new CredentialFactory()
            const mockCredentials: BakeCredentials = {
                legacyCredentials: null,
                modernCredentials: {
                    getToken: async () => { throw new Error('Auth failed') }
                },
                tenantId: 'test',
                subscriptionId: 'test'
            }

            try {
                await factory.validateCredentials(mockCredentials)
                expect.fail('Should have thrown')
            } catch (error: any) {
                expect(error).to.be.instanceOf(CredentialFactoryError)
                expect(error.message).to.contain('Credential validation failed')
            }
        })

        it('falls back to legacy credential validation when modern is null', async () => {
            const factory = new CredentialFactory()
            const mockCredentials: BakeCredentials = {
                legacyCredentials: {
                    getToken: async () => 'legacy-token'
                },
                modernCredentials: null,
                tenantId: 'test',
                subscriptionId: 'test'
            }

            const result = await factory.validateCredentials(mockCredentials)

            expect(result).to.be.true
        })

        it('throws when legacy credentials getToken returns empty', async () => {
            const factory = new CredentialFactory()
            const mockCredentials: BakeCredentials = {
                legacyCredentials: {
                    getToken: async () => null
                },
                modernCredentials: null,
                tenantId: 'test',
                subscriptionId: 'test'
            }

            try {
                await factory.validateCredentials(mockCredentials)
                expect.fail('Should have thrown')
            } catch (error: any) {
                expect(error).to.be.instanceOf(CredentialFactoryError)
                expect(error.message).to.contain('Legacy token acquisition returned empty')
            }
        })

        it('throws when legacy credentials getToken throws', async () => {
            const factory = new CredentialFactory()
            const mockCredentials: BakeCredentials = {
                legacyCredentials: {
                    getToken: async () => { throw new Error('Legacy auth failed') }
                },
                modernCredentials: null,
                tenantId: 'test',
                subscriptionId: 'test'
            }

            try {
                await factory.validateCredentials(mockCredentials)
                expect.fail('Should have thrown')
            } catch (error: any) {
                expect(error).to.be.instanceOf(CredentialFactoryError)
                expect(error.message).to.contain('Legacy credential validation failed')
            }
        })

        it('returns true when neither credential has getToken', async () => {
            const factory = new CredentialFactory()
            const mockCredentials: BakeCredentials = {
                legacyCredentials: {},
                modernCredentials: {},
                tenantId: 'test',
                subscriptionId: 'test'
            }

            const result = await factory.validateCredentials(mockCredentials)

            expect(result).to.be.true
        })
    })
})

describe('CredentialFactoryError', () => {
    it('has correct name property', () => {
        const error = new CredentialFactoryError('test message')
        expect(error.name).to.equal('CredentialFactoryError')
    })

    it('stores message correctly', () => {
        const error = new CredentialFactoryError('test message')
        expect(error.message).to.equal('test message')
    })

    it('stores cause when provided', () => {
        const cause = new Error('original error')
        const error = new CredentialFactoryError('wrapped message', cause)
        expect(error.cause).to.equal(cause)
    })

    it('is instanceof Error', () => {
        const error = new CredentialFactoryError('test')
        expect(error).to.be.instanceOf(Error)
    })
})

describe('isModernCredential', () => {
    it('returns false for null', () => {
        expect(isModernCredential(null)).to.not.be.ok
    })

    it('returns false for undefined', () => {
        expect(isModernCredential(undefined)).to.not.be.ok
    })

    it('returns false for object without getToken', () => {
        expect(isModernCredential({})).to.be.false
    })

    it('returns false for object with non-function getToken', () => {
        expect(isModernCredential({ getToken: 'not-a-function' })).to.be.false
    })

    it('returns true for ClientSecretCredential-like object', () => {
        class ClientSecretCredential {
            getToken() { return Promise.resolve({ token: 'test' }) }
        }
        const cred = new ClientSecretCredential()
        expect(isModernCredential(cred)).to.be.true
    })

    it('returns false for generic object with getToken function', () => {
        const cred = { getToken: () => {} }
        expect(isModernCredential(cred)).to.be.false
    })
})

describe('isLegacyCredential', () => {
    it('returns false for null', () => {
        expect(isLegacyCredential(null)).to.not.be.ok
    })

    it('returns false for undefined', () => {
        expect(isLegacyCredential(undefined)).to.not.be.ok
    })

    it('returns false for object without getToken', () => {
        expect(isLegacyCredential({})).to.be.false
    })

    it('returns true for ApplicationTokenCredentials-like object', () => {
        class ApplicationTokenCredentials {
            getToken() { return Promise.resolve('token') }
            signRequest(request: any) { return request }
        }
        const cred = new ApplicationTokenCredentials()
        expect(isLegacyCredential(cred)).to.be.true
    })

    it('returns true for object with getToken and signRequest', () => {
        const cred = { 
            getToken: () => Promise.resolve('token'),
            signRequest: (req: any) => req
        }
        expect(isLegacyCredential(cred)).to.be.true
    })

    it('returns false for object with only getToken (no signRequest)', () => {
        const cred = { getToken: () => {} }
        expect(isLegacyCredential(cred)).to.be.false
    })
})

describe('BakeCredentials interface', () => {
    it('can be created with all required properties', () => {
        const credentials: BakeCredentials = {
            legacyCredentials: { getToken: () => {} },
            modernCredentials: { getToken: () => {} },
            tenantId: 'tenant',
            subscriptionId: 'subscription'
        }

        expect(credentials.legacyCredentials).to.not.be.null
        expect(credentials.modernCredentials).to.not.be.null
        expect(credentials.tenantId).to.equal('tenant')
        expect(credentials.subscriptionId).to.equal('subscription')
    })

    it('allows null credentials', () => {
        const credentials: BakeCredentials = {
            legacyCredentials: null,
            modernCredentials: null,
            tenantId: 'tenant',
            subscriptionId: 'subscription'
        }

        expect(credentials.legacyCredentials).to.be.null
        expect(credentials.modernCredentials).to.be.null
    })
})

describe('Auth equivalence tests', () => {
    describe('same env var inputs produce equivalent auth behavior', () => {
        it('skipAuth produces consistent results across calls', async () => {
            const factory1 = new CredentialFactory()
            const factory2 = new CredentialFactory()
            const auth = createAuth({ skipAuth: true })

            const result1 = await factory1.createCredentials(auth)
            const result2 = await factory2.createCredentials(auth)

            // Both should have same structure
            expect(result1.tenantId).to.equal(result2.tenantId)
            expect(result1.subscriptionId).to.equal(result2.subscriptionId)
            
            // Both should have getToken methods
            expect(typeof result1.legacyCredentials.getToken).to.equal('function')
            expect(typeof result2.legacyCredentials.getToken).to.equal('function')
        })

        it('preserves auth config values in result', async () => {
            const factory = new CredentialFactory()
            const auth = createAuth({
                skipAuth: true,
                tenantId: 'my-tenant-123',
                subscriptionId: 'my-sub-456'
            })

            const result = await factory.createCredentials(auth)

            expect(result.tenantId).to.equal('my-tenant-123')
            expect(result.subscriptionId).to.equal('my-sub-456')
        })
    })

    describe('token acquisition errors are handled consistently', () => {
        it('wraps validation errors in CredentialFactoryError', async () => {
            const factory = new CredentialFactory()
            const failingCredentials: BakeCredentials = {
                legacyCredentials: null,
                modernCredentials: {
                    getToken: async () => { throw new Error('Network failure') }
                },
                tenantId: 'test',
                subscriptionId: 'test'
            }

            try {
                await factory.validateCredentials(failingCredentials)
                expect.fail('Should have thrown')
            } catch (error: any) {
                expect(error).to.be.instanceOf(CredentialFactoryError)
                expect(error.cause).to.be.instanceOf(Error)
                expect(error.cause.message).to.equal('Network failure')
            }
        })

        it('includes original error message in wrapped error', async () => {
            const factory = new CredentialFactory()
            const failingCredentials: BakeCredentials = {
                legacyCredentials: {
                    getToken: async () => { throw new Error('Specific auth error') }
                },
                modernCredentials: null,
                tenantId: 'test',
                subscriptionId: 'test'
            }

            try {
                await factory.validateCredentials(failingCredentials)
                expect.fail('Should have thrown')
            } catch (error: any) {
                expect(error.message).to.contain('Specific auth error')
            }
        })
    })
})
