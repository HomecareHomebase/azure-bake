import { expect } from 'chai'
import 'mocha'

import { Logger } from '../src/logger'

describe('Logger', () => {
        describe('constructor defaults', () => {
            it('defaults prefix to empty array and log level to info', () => {
                const logger = new Logger()
                expect(logger.getPre()).to.deep.equal([])
                expect(logger.getLogLevel()).to.equal('info')
            })

            it('accepts only prefix parameter', () => {
                const logger = new Logger(['single'])
                expect(logger.getPre()).to.deep.equal(['single'])
                expect(logger.getLogLevel()).to.equal('info')
            })
        })

    it('returns prefixes and log level', () => {
        const logger = new Logger(['alpha', 'beta'], 'info')
        expect(logger.getPre()).to.deep.equal(['alpha', 'beta'])
        expect(logger.getLogLevel()).to.equal('info')
    })

    it('emits info, warn, and error at info level', () => {
        const original = {
            log: console.log,
            warn: console.warn,
            error: console.error
        }
        const calls = { log: 0, warn: 0, error: 0 }

        console.log = (() => {
            calls.log += 1
        }) as any
        console.warn = (() => {
            calls.warn += 1
        }) as any
        console.error = (() => {
            calls.error += 1
        }) as any

        try {
            const logger = new Logger([], 'info')
            logger.debug('debug')
            logger.log('log')
            logger.warn('warn')
            logger.error('error')

            expect(calls.log).to.equal(1)
            expect(calls.warn).to.equal(1)
            expect(calls.error).to.equal(1)
        } finally {
            console.log = original.log
            console.warn = original.warn
            console.error = original.error
        }
    })

    it('emits debug messages only at debug level', () => {
        const original = {
            log: console.log,
            warn: console.warn,
            error: console.error
        }
        const calls = { log: 0, warn: 0, error: 0 }

        console.log = (() => {
            calls.log += 1
        }) as any
        console.warn = (() => {
            calls.warn += 1
        }) as any
        console.error = (() => {
            calls.error += 1
        }) as any

        try {
            const logger = new Logger([], 'debug')
            logger.debug('debug')
            logger.log('log')
            logger.warn('warn')
            logger.error('error')

            expect(calls.log).to.equal(1)
            expect(calls.warn).to.equal(1)
            expect(calls.error).to.equal(2)
        } finally {
            console.log = original.log
            console.warn = original.warn
            console.error = original.error
        }
    })

        it('emits only warn and error messages at warn level', () => {
            const original = {
                log: console.log,
                warn: console.warn,
                error: console.error
            }
            const calls = { log: 0, warn: 0, error: 0 }

            console.log = (() => {
                calls.log += 1
            }) as any
            console.warn = (() => {
                calls.warn += 1
            }) as any
            console.error = (() => {
                calls.error += 1
            }) as any

            try {
                const logger = new Logger([], 'warn')
                logger.debug('debug')  // should not emit
                logger.log('log')      // should not emit
                logger.warn('warn')    // should emit
                logger.error('error')  // should emit

                expect(calls.log).to.equal(0)
                expect(calls.warn).to.equal(1)
                expect(calls.error).to.equal(1)
            } finally {
                console.log = original.log
                console.warn = original.warn
                console.error = original.error
            }
        })

        it('emits only error messages at error level', () => {
            const original = {
                log: console.log,
                warn: console.warn,
                error: console.error
            }
            const calls = { log: 0, warn: 0, error: 0 }

            console.log = (() => {
                calls.log += 1
            }) as any
            console.warn = (() => {
                calls.warn += 1
            }) as any
            console.error = (() => {
                calls.error += 1
            }) as any

            try {
                const logger = new Logger([], 'error')
                logger.debug('debug')  // should not emit
                logger.log('log')      // should not emit
                logger.warn('warn')    // should not emit
                logger.error('error')  // should emit

                expect(calls.log).to.equal(0)
                expect(calls.warn).to.equal(0)
                expect(calls.error).to.equal(1)
            } finally {
                console.log = original.log
                console.warn = original.warn
                console.error = original.error
            }
        })

        it('silences all messages at unknown log level', () => {
            const original = {
                log: console.log,
                warn: console.warn,
                error: console.error
            }
            const calls = { log: 0, warn: 0, error: 0 }

            console.log = (() => {
                calls.log += 1
            }) as any
            console.warn = (() => {
                calls.warn += 1
            }) as any
            console.error = (() => {
                calls.error += 1
            }) as any

            try {
                const logger = new Logger([], 'silent')
                logger.debug('debug')
                logger.log('log')
                logger.warn('warn')
                logger.error('error')

                expect(calls.log).to.equal(0)
                expect(calls.warn).to.equal(0)
                expect(calls.error).to.equal(0)
            } finally {
                console.log = original.log
                console.warn = original.warn
                console.error = original.error
            }
        })

        it('passes additional arguments to console methods', () => {
            const original = console.log
            let capturedArgs: any[] = []

            console.log = ((...args: any[]) => {
                capturedArgs = args
            }) as any

            try {
                const logger = new Logger([], 'info')
                logger.log('message', 'arg1', 'arg2', { key: 'value' })

                expect(capturedArgs.length).to.be.greaterThan(1)
                expect(capturedArgs).to.include('arg1')
                expect(capturedArgs).to.include('arg2')
            } finally {
                console.log = original
            }
        })
})