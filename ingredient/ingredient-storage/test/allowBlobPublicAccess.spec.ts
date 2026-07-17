import { expect } from "chai";
import "mocha";
import storage from "../src/storage.json";
import storageNetwork from "../src/storageNetwork.json";
import storageDatalake from "../src/storageDatalake.json";
import { normalizeAllowBlobPublicAccess, applyAllowBlobPublicAccess } from "../src/allowBlobPublicAccess";
import { ANON_BLOB_ACCESS_EXCEPTION_TAG } from "../src/constants";

const STORAGE_ACCOUNT_TYPE = "Microsoft.Storage/storageAccounts";
const EXCEPTION_TAG_KEY = "allow-anonymous-blob-access";

const TEMPLATES = [
    { name: "storage.json", t: storage },
    { name: "storageNetwork.json", t: storageNetwork },
    { name: "storageDatalake.json", t: storageDatalake }
];

function findStorageAccount(t: any) {
    return t.resources.find((r: any) => r.type === STORAGE_ACCOUNT_TYPE);
}

function hasOwn(obj: any, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

// T007 — AC1: omitted param emits no allowBlobPublicAccess property (all three templates)
describe("applyAllowBlobPublicAccess — AC1 omitted param emits no property", () => {
    TEMPLATES.forEach(({ name, t }) => {
        it(`${name}: undefined leaves no allowBlobPublicAccess property on the storage account`, () => {
            const account = findStorageAccount(applyAllowBlobPublicAccess(t, undefined));
            expect(hasOwn(account.properties, "allowBlobPublicAccess")).to.equal(false);
        });

        it(`${name}: null leaves no allowBlobPublicAccess property on the storage account`, () => {
            const account = findStorageAccount(applyAllowBlobPublicAccess(t, null));
            expect(hasOwn(account.properties, "allowBlobPublicAccess")).to.equal(false);
        });
    });
});

// T008 — AC7: omitted result is byte-for-byte identical to the untouched original (all three templates)
describe("applyAllowBlobPublicAccess — AC7 omitted is byte-for-byte identical", () => {
    TEMPLATES.forEach(({ name, t }) => {
        it(`${name}: undefined returns the same reference and deep-equals the pre-call snapshot`, () => {
            const snapshot = JSON.stringify(t);
            const result = applyAllowBlobPublicAccess(t, undefined);
            expect(result).to.equal(t);
            expect(JSON.stringify(result)).to.equal(snapshot);
        });
    });
});

// T009 — AC7: explicit-value calls never mutate the shared imported module (deep-clone isolation)
describe("applyAllowBlobPublicAccess — AC7 shared module is never mutated", () => {
    it("true then false on storage.json leave the imported module pristine and return distinct clones", () => {
        const baseline = JSON.stringify(storage);
        const enabledClone = applyAllowBlobPublicAccess(storage, true);
        const disabledClone = applyAllowBlobPublicAccess(storage, false);

        const moduleAccount = findStorageAccount(storage);
        expect(hasOwn(moduleAccount.properties, "allowBlobPublicAccess")).to.equal(false);
        expect(moduleAccount.tags).to.deep.equal({ Metrics: "*" });
        expect(JSON.stringify(storage)).to.equal(baseline);

        expect(enabledClone).to.not.equal(storage);
        expect(disabledClone).to.not.equal(storage);
        expect(enabledClone).to.not.equal(disabledClone);
    });
});

// T010 — AC2: boolean false writes property false, stamps no tag, preserves Metrics (all three templates)
describe("applyAllowBlobPublicAccess — AC2 boolean false disables anonymous access without a tag", () => {
    TEMPLATES.forEach(({ name, t }) => {
        it(`${name}: false writes property false, preserves Metrics, stamps no exception tag`, () => {
            const account = findStorageAccount(applyAllowBlobPublicAccess(t, false));
            expect(account.properties.allowBlobPublicAccess).to.equal(false);
            expect(account.tags.Metrics).to.equal("*");
            expect(hasOwn(account.tags, EXCEPTION_TAG_KEY)).to.equal(false);
        });
    });
});

// T011 — AC3: boolean true writes property true and stamps the exception tag (all three templates)
describe("applyAllowBlobPublicAccess — AC3 boolean true enables anonymous access and stamps the tag", () => {
    TEMPLATES.forEach(({ name, t }) => {
        it(`${name}: true writes property true and stamps the exception tag`, () => {
            const account = findStorageAccount(applyAllowBlobPublicAccess(t, true));
            expect(account.properties.allowBlobPublicAccess).to.equal(true);
            expect(account.tags[EXCEPTION_TAG_KEY]).to.equal("true");
        });
    });
});

// T012 — AC5: exception tag merges alongside existing tags, dropping nothing (all three templates)
describe("applyAllowBlobPublicAccess — AC5 exception tag merges alongside existing Metrics tag", () => {
    TEMPLATES.forEach(({ name, t }) => {
        it(`${name}: true keeps every original tag and adds exactly the exception tag`, () => {
            const originalKeyCount = Object.keys(findStorageAccount(t).tags).length;
            const account = findStorageAccount(applyAllowBlobPublicAccess(t, true));
            expect(account.tags.Metrics).to.equal("*");
            expect(account.tags[EXCEPTION_TAG_KEY]).to.equal("true");
            expect(Object.keys(account.tags).length).to.equal(originalKeyCount + 1);
        });
    });
});

// T013 — AC6: cross-template parity; account located by type; other resources untouched
describe("applyAllowBlobPublicAccess — AC6 cross-template parity", () => {
    TEMPLATES.forEach(({ name, t }) => {
        it(`${name}: omitted, false, and true produce the expected property/tag shape`, () => {
            const omitted = findStorageAccount(applyAllowBlobPublicAccess(t, undefined));
            expect(hasOwn(omitted.properties, "allowBlobPublicAccess")).to.equal(false);
            expect(hasOwn(omitted.tags, EXCEPTION_TAG_KEY)).to.equal(false);

            const disabled = findStorageAccount(applyAllowBlobPublicAccess(t, false));
            expect(disabled.properties.allowBlobPublicAccess).to.equal(false);
            expect(hasOwn(disabled.tags, EXCEPTION_TAG_KEY)).to.equal(false);

            const enabled = findStorageAccount(applyAllowBlobPublicAccess(t, true));
            expect(enabled.properties.allowBlobPublicAccess).to.equal(true);
            expect(enabled.tags[EXCEPTION_TAG_KEY]).to.equal("true");
        });

        it(`${name}: locates the storage account by resource type, not array index`, () => {
            const account = findStorageAccount(applyAllowBlobPublicAccess(t, true));
            expect(account.type).to.equal(STORAGE_ACCOUNT_TYPE);
        });

        it(`${name}: leaves non-storage-account resources untouched`, () => {
            const otherBefore = (t.resources as any[])
                .filter((r: any) => r.type !== STORAGE_ACCOUNT_TYPE)
                .map((r: any) => JSON.stringify(r));
            const result = applyAllowBlobPublicAccess(t, true);
            const otherAfter = (result.resources as any[])
                .filter((r: any) => r.type !== STORAGE_ACCOUNT_TYPE)
                .map((r: any) => JSON.stringify(r));
            expect(otherAfter).to.deep.equal(otherBefore);
        });
    });
});

// T014 — AC1: invalid input is rejected at the boundary with an actionable error
describe("normalizeAllowBlobPublicAccess — AC1 rejects invalid input at the boundary", () => {
    const invalidInputs: Array<{ label: string; value: unknown }> = [
        { label: '"yes"', value: "yes" },
        { label: "1", value: 1 },
        { label: "{}", value: {} },
        { label: '"null"', value: "null" }
    ];

    invalidInputs.forEach(({ label, value }) => {
        it(`throws an actionable Error naming the offending value for ${label}`, () => {
            let error: Error | undefined;
            try {
                normalizeAllowBlobPublicAccess(value);
            } catch (e) {
                error = e as Error;
            }
            expect(error, "expected an Error to be thrown").to.be.instanceOf(Error);
            expect(error!.message).to.contain(String(value));
            expect(error!.message.toLowerCase()).to.contain("boolean");
        });
    });

    it("does not mutate the template when an invalid value is supplied", () => {
        const baseline = JSON.stringify(storage);
        expect(() => applyAllowBlobPublicAccess(storage, "yes")).to.throw(Error);
        expect(JSON.stringify(storage)).to.equal(baseline);
    });
});

// T015 — AC2: string "false" forms normalize to boolean false and flow through end-to-end
describe("normalizeAllowBlobPublicAccess — AC2 string false forms normalize to false", () => {
    ["false", "FALSE", " False "].forEach(input => {
        it(`normalizes ${JSON.stringify(input)} to false`, () => {
            expect(normalizeAllowBlobPublicAccess(input)).to.equal(false);
        });
    });

    it('applyAllowBlobPublicAccess(storage, "false") writes property false end-to-end', () => {
        const account = findStorageAccount(applyAllowBlobPublicAccess(storage, "false"));
        expect(account.properties.allowBlobPublicAccess).to.equal(false);
    });
});

// T016 — AC3: string "true" forms normalize to boolean true and stamp the tag end-to-end
describe("normalizeAllowBlobPublicAccess — AC3 string true forms normalize to true", () => {
    ["true", "TRUE"].forEach(input => {
        it(`normalizes ${JSON.stringify(input)} to true`, () => {
            expect(normalizeAllowBlobPublicAccess(input)).to.equal(true);
        });
    });

    it('applyAllowBlobPublicAccess(storage, "true") writes property true and stamps the tag', () => {
        const account = findStorageAccount(applyAllowBlobPublicAccess(storage, "true"));
        expect(account.properties.allowBlobPublicAccess).to.equal(true);
        expect(account.tags[EXCEPTION_TAG_KEY]).to.equal("true");
    });
});

// T017 — AC4: the exception tag is sourced from the exported constant, not a literal
describe("ANON_BLOB_ACCESS_EXCEPTION_TAG — AC4 constant contract", () => {
    it("deep-equals the documented exception-tag contract", () => {
        expect(ANON_BLOB_ACCESS_EXCEPTION_TAG).to.deep.equal({
            name: "allow-anonymous-blob-access",
            value: "true"
        });
    });

    it("is the source of the emitted tag key and value on a true call", () => {
        const account = findStorageAccount(applyAllowBlobPublicAccess(storage, true));
        expect(account.tags[ANON_BLOB_ACCESS_EXCEPTION_TAG.name]).to.equal(ANON_BLOB_ACCESS_EXCEPTION_TAG.value);
    });
});

// T026 — coverage: applyAllowBlobPublicAccess throws when no storage-account resource exists
describe("applyAllowBlobPublicAccess — missing storage-account resource throws", () => {
    it("throws an Error naming the Microsoft.Storage/storageAccounts type on an explicit value", () => {
        let error: Error | undefined;
        try {
            applyAllowBlobPublicAccess({ resources: [] }, true);
        } catch (e) {
            error = e as Error;
        }
        expect(error, "expected an Error to be thrown").to.be.instanceOf(Error);
        expect(error!.message).to.contain(STORAGE_ACCOUNT_TYPE);
    });
});

// T026 — coverage: defensive properties/tags fallbacks materialize on a bare account resource
describe("applyAllowBlobPublicAccess — bare account resource gets properties and tags created", () => {
    it("creates properties and tags when true is applied to an account lacking both", () => {
        const template = { resources: [{ type: STORAGE_ACCOUNT_TYPE }] };
        const account = findStorageAccount(applyAllowBlobPublicAccess(template, true));
        expect(account.properties.allowBlobPublicAccess).to.equal(true);
        expect(account.tags[EXCEPTION_TAG_KEY]).to.equal("true");
    });

    it("creates properties without a tag when false is applied to an account lacking both", () => {
        const template = { resources: [{ type: STORAGE_ACCOUNT_TYPE }] };
        const account = findStorageAccount(applyAllowBlobPublicAccess(template, false));
        expect(account.properties.allowBlobPublicAccess).to.equal(false);
        expect(hasOwn(account, "tags")).to.equal(false);
    });
});
