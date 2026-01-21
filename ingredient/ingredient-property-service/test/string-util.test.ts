import { expect } from 'chai'
import 'mocha'

import { StringUtils } from '../src/utils/stringUtil'

describe('property-service string utilities', () => {
    it('converts strings to title case', () => {
        expect(StringUtils.ToTitleCase('hello WORLD')).to.equal('Hello World')
    })

    it('returns undefined for empty base64 input', () => {
        expect(StringUtils.Base64Decode(undefined)).to.equal(undefined)
        expect(StringUtils.Base64Decode('')).to.equal(undefined)
    })

    it('returns byte array using current base64 behavior', () => {
        const bytes = StringUtils.Base64Decode('abc')
        expect(bytes).to.not.equal(undefined)
        expect(Array.from(bytes || [])).to.deep.equal([89, 87, 74, 106])
    })
})