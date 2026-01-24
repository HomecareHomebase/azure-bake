import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import { Logger } from '@azbake/core'

import { Authenticator } from '../src/client/authenticator'

function createLogger() {
    const logs: string[] = []
    const errors: string[] = []
    const logger = {
        log: (msg: string) => logs.push(msg),
        error: (msg: string) => errors.push(msg),
        debug: (msg: string) => logs.push(msg)
    } as unknown as Logger

    return { logger, logs, errors }
}

describe('Authenticator', () => {
    let sandbox: sinon.SinonSandbox

    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
    })

    describe('Authenticate', () => {
        it('returns access token on successful authentication', async () => {
            const { logger, logs } = createLogger()

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ token: 'test-token-12345' })
            }
            const credentialFactory = sandbox.stub().returns(mockCredentials)
            const authenticator = new Authenticator(logger, credentialFactory)

            const result = await authenticator.Authenticate(
                'client-id',
                'client-secret',
                'tenant-id',
                'https://resource.azure.net'
            )

            expect(result).to.equal('test-token-12345')
            expect(logs.some(msg => msg.includes('Authentication to Azure AD was successful'))).to.equal(true)
        })

        it('throws error when getToken fails', async () => {
            const { logger, errors } = createLogger()

            const authError = new Error('Invalid credentials')
            const mockCredentials = {
                getToken: sandbox.stub().rejects(authError)
            }
            const credentialFactory = sandbox.stub().returns(mockCredentials)
            const authenticator = new Authenticator(logger, credentialFactory)

            let caughtError: Error | null = null
            try {
                await authenticator.Authenticate(
                    'client-id',
                    'bad-secret',
                    'tenant-id',
                    'https://resource.azure.net'
                )
            } catch (err) {
                caughtError = err as Error
            }

            expect(caughtError).to.not.equal(null)
            expect(caughtError?.message).to.equal('Invalid credentials')
            expect(errors.some(msg => msg.includes('Authentication to Azure AD failed'))).to.equal(true)
        })

        it('throws error when access token is null', async () => {
            const { logger, errors } = createLogger()

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ token: null })
            }
            const credentialFactory = sandbox.stub().returns(mockCredentials)
            const authenticator = new Authenticator(logger, credentialFactory)

            let caughtError: Error | null = null
            try {
                await authenticator.Authenticate(
                    'client-id',
                    'client-secret',
                    'tenant-id',
                    'https://resource.azure.net'
                )
            } catch (err) {
                caughtError = err as Error
            }

            expect(caughtError).to.not.equal(null)
            expect(caughtError?.message).to.contain('access token is null or empty')
            expect(errors.some(msg => msg.includes('access token is null or empty'))).to.equal(true)
        })

        it('throws error when access token is empty string', async () => {
            const { logger, errors } = createLogger()

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ token: '' })
            }
            const credentialFactory = sandbox.stub().returns(mockCredentials)
            const authenticator = new Authenticator(logger, credentialFactory)

            let caughtError: Error | null = null
            try {
                await authenticator.Authenticate(
                    'client-id',
                    'client-secret',
                    'tenant-id',
                    'https://resource.azure.net'
                )
            } catch (err) {
                caughtError = err as Error
            }

            expect(caughtError).to.not.equal(null)
            expect(caughtError?.message).to.contain('access token is null or empty')
        })

        it('requests token with the expected scope', async () => {
            const { logger } = createLogger()

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ token: 'test-token' })
            }
            const credentialFactory = sandbox.stub().returns(mockCredentials)
            const authenticator = new Authenticator(logger, credentialFactory)

            await authenticator.Authenticate(
                'my-client-id',
                'my-client-secret',
                'my-tenant-id',
                'https://my-resource.azure.net'
            )

            expect(credentialFactory.calledOnce).to.equal(true)
            const [tenantId, clientId, clientSecret] = credentialFactory.firstCall.args
            expect(tenantId).to.equal('my-tenant-id')
            expect(clientId).to.equal('my-client-id')
            expect(clientSecret).to.equal('my-client-secret')
            expect(mockCredentials.getToken.calledOnceWithExactly('https://my-resource.azure.net/.default')).to.equal(true)
        })
    })
})
