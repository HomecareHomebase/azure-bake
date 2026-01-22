import { expect } from 'chai'
import 'mocha'
import * as sinon from 'sinon'

import { Logger } from '@azbake/core'
import * as nodeauth from '@azure/ms-rest-nodeauth'

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
            const authenticator = new Authenticator(logger)

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ accessToken: 'test-token-12345' })
            }
            sandbox.stub(nodeauth, 'loginWithServicePrincipalSecret').resolves(
                mockCredentials as unknown as nodeauth.ApplicationTokenCredentials
            )

            const result = await authenticator.Authenticate(
                'client-id',
                'client-secret',
                'tenant-id',
                'https://resource.azure.net'
            )

            expect(result).to.equal('test-token-12345')
            expect(logs.some(msg => msg.includes('Authentication to Azure AD was successful'))).to.equal(true)
        })

        it('throws error when loginWithServicePrincipalSecret fails', async () => {
            const { logger, errors } = createLogger()
            const authenticator = new Authenticator(logger)

            const authError = new Error('Invalid credentials')
            sandbox.stub(nodeauth, 'loginWithServicePrincipalSecret').rejects(authError)

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
            const authenticator = new Authenticator(logger)

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ accessToken: null })
            }
            sandbox.stub(nodeauth, 'loginWithServicePrincipalSecret').resolves(
                mockCredentials as unknown as nodeauth.ApplicationTokenCredentials
            )

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
            const authenticator = new Authenticator(logger)

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ accessToken: '' })
            }
            sandbox.stub(nodeauth, 'loginWithServicePrincipalSecret').resolves(
                mockCredentials as unknown as nodeauth.ApplicationTokenCredentials
            )

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

        it('passes correct token options to loginWithServicePrincipalSecret', async () => {
            const { logger } = createLogger()
            const authenticator = new Authenticator(logger)

            const mockCredentials = {
                getToken: sandbox.stub().resolves({ accessToken: 'test-token' })
            }
            const loginStub = sandbox.stub(nodeauth, 'loginWithServicePrincipalSecret').resolves(
                mockCredentials as unknown as nodeauth.ApplicationTokenCredentials
            )

            await authenticator.Authenticate(
                'my-client-id',
                'my-client-secret',
                'my-tenant-id',
                'https://my-resource.azure.net'
            )

            expect(loginStub.calledOnce).to.equal(true)
            const [clientId, clientSecret, domain, tokenOptions] = loginStub.firstCall.args
            expect(clientId).to.equal('my-client-id')
            expect(clientSecret).to.equal('my-client-secret')
            expect(domain).to.equal('my-tenant-id')
            expect(tokenOptions).to.deep.include({ tokenAudience: 'https://my-resource.azure.net' })
        })
    })
})
