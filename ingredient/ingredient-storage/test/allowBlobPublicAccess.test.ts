import { applyAllowBlobPublicAccess, normalizeAllowBlobPublicAccess } from "../src/allowBlobPublicAccess";

/**
 * Test suite for allowBlobPublicAccess baseline flip (Pass-2).
 * Tests baseline-flip behavior: omitted (undefined/null) now defaults to explicit false
 * instead of "property not written" (Pass-1 behavior).
 */

interface TestTemplate {
    $schema: string;
    contentVersion: string;
    resources: Array<{
        type: string;
        name: string;
        location: string;
        apiVersion: string;
        sku: { name: string; tier: string };
        kind: string;
        properties: {
            accessTier: string;
            supportsHttpsTrafficOnly: boolean;
            minimumTlsVersion: string;
            [key: string]: any;
        };
        tags?: { [key: string]: string };
    }>;
}

describe("allowBlobPublicAccess — Baseline Flip (Pass-2)", () => {
    // Base template for testing
    const baseTemplate: TestTemplate = {
        $schema: "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
        contentVersion: "1.0.0.0",
        resources: [
            {
                type: "Microsoft.Storage/storageAccounts",
                name: "storageaccount",
                location: "eastus",
                apiVersion: "2020-08-01-preview",
                sku: { name: "Standard_LRS", tier: "Standard" },
                kind: "StorageV2",
                properties: {
                    accessTier: "Hot",
                    supportsHttpsTrafficOnly: true,
                    minimumTlsVersion: "TLS1_2"
                },
                tags: {
                    Metrics: "*"
                }
            }
        ]
    };

    describe("Test 1: Omitted parameter (undefined)", () => {
        it("should write explicit allowBlobPublicAccess = false and preserve existing tags", () => {
            const result = applyAllowBlobPublicAccess(baseTemplate, undefined);
            
            // Verify template is deep-cloned (not the same reference)
            expect(result).not.toBe(baseTemplate);
            
            // Verify property is written
            const account = result.resources[0];
            expect(account.properties.allowBlobPublicAccess).toBe(false);
            
            // Verify no exception tag is applied
            expect(account.tags).toEqual({ Metrics: "*" });
        });
    });

    describe("Test 2: Omitted parameter (null)", () => {
        it("should write explicit allowBlobPublicAccess = false", () => {
            const result = applyAllowBlobPublicAccess(baseTemplate, null);
            
            const account = result.resources[0];
            expect(account.properties.allowBlobPublicAccess).toBe(false);
            expect(account.tags).toEqual({ Metrics: "*" });
        });
    });

    describe("Test 3: Explicit false", () => {
        it("should write allowBlobPublicAccess = false and no exception tag", () => {
            const result = applyAllowBlobPublicAccess(baseTemplate, false);
            
            const account = result.resources[0];
            expect(account.properties.allowBlobPublicAccess).toBe(false);
            expect(account.tags).toEqual({ Metrics: "*" });
        });
    });

    describe("Test 4: Explicit true", () => {
        it("should write allowBlobPublicAccess = true and stamp exception tag", () => {
            const result = applyAllowBlobPublicAccess(baseTemplate, true);
            
            const account = result.resources[0];
            expect(account.properties.allowBlobPublicAccess).toBe(true);
            expect(account.tags).toEqual({
                Metrics: "*",
                "hchb-policy-exempt-anon-blob": "true"
            });
        });
    });

    describe("Test 5: String 'true'", () => {
        it("should normalize string 'true' to boolean and apply exception tag", () => {
            const result = applyAllowBlobPublicAccess(baseTemplate, "true");
            
            const account = result.resources[0];
            expect(account.properties.allowBlobPublicAccess).toBe(true);
            expect(account.tags["hchb-policy-exempt-anon-blob"]).toBe("true");
        });
    });

    describe("Test 6: String 'false'", () => {
        it("should normalize string 'false' to boolean and not apply tag", () => {
            const result = applyAllowBlobPublicAccess(baseTemplate, "false");
            
            const account = result.resources[0];
            expect(account.properties.allowBlobPublicAccess).toBe(false);
            expect(account.tags).toEqual({ Metrics: "*" });
        });
    });

    describe("Test 7: Invalid value 'yes'", () => {
        it("should throw error with actionable message naming the offending value", () => {
            expect(() => applyAllowBlobPublicAccess(baseTemplate, "yes")).toThrow(
                "Invalid allowBlobPublicAccess value 'yes'. Expected boolean true or false."
            );
        });
    });

    describe("Test 8: Invalid value (numeric 1)", () => {
        it("should throw error for numeric value", () => {
            expect(() => applyAllowBlobPublicAccess(baseTemplate, 1)).toThrow(
                "Invalid allowBlobPublicAccess value '1'. Expected boolean true or false."
            );
        });
    });

    describe("Test 9: Tag preservation with explicit true", () => {
        it("should merge exception tag with existing tags and drop none", () => {
            const templateWithMultipleTags = JSON.parse(JSON.stringify(baseTemplate));
            templateWithMultipleTags.resources[0].tags = {
                Metrics: "*",
                Environment: "production",
                Owner: "platform-team"
            };
            
            const result = applyAllowBlobPublicAccess(templateWithMultipleTags, true);
            const account = result.resources[0];
            
            // Verify all existing tags are preserved
            expect(account.tags.Metrics).toBe("*");
            expect(account.tags.Environment).toBe("production");
            expect(account.tags.Owner).toBe("platform-team");
            // Verify exception tag is added
            expect(account.tags["hchb-policy-exempt-anon-blob"]).toBe("true");
        });
    });

    describe("Test 10: Missing storage account resource", () => {
        it("should throw error mentioning missing resource", () => {
            const templateWithoutStorage = {
                $schema: "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                contentVersion: "1.0.0.0",
                resources: [
                    {
                        type: "Microsoft.KeyVault/vaults",
                        name: "keyvault",
                        location: "eastus",
                        apiVersion: "2019-09-01",
                        properties: {}
                    }
                ]
            };
            
            expect(() => applyAllowBlobPublicAccess(templateWithoutStorage, false)).toThrow(
                "Storage account resource ('Microsoft.Storage/storageAccounts') not found in template."
            );
        });
    });

    describe("Baseline flip behavior validation", () => {
        it("should produce equivalent output for omitted and explicit false", () => {
            const resultOmitted = applyAllowBlobPublicAccess(baseTemplate, undefined);
            const resultExplicitFalse = applyAllowBlobPublicAccess(baseTemplate, false);
            
            const accountOmitted = resultOmitted.resources[0];
            const accountExplicitFalse = resultExplicitFalse.resources[0];
            
            expect(accountOmitted.properties.allowBlobPublicAccess).toBe(
                accountExplicitFalse.properties.allowBlobPublicAccess
            );
            expect(accountOmitted.tags).toEqual(accountExplicitFalse.tags);
        });

        it("should produce a deep clone (no mutation of original template)", () => {
            const original = JSON.parse(JSON.stringify(baseTemplate));
            const result = applyAllowBlobPublicAccess(baseTemplate, true);
            
            // Original should be untouched
            expect(baseTemplate.resources[0].properties.allowBlobPublicAccess).toBeUndefined();
            expect(baseTemplate.resources[0].tags).toEqual({ Metrics: "*" });
            
            // Result should have modifications
            expect(result.resources[0].properties.allowBlobPublicAccess).toBe(true);
            expect(result.resources[0].tags["hchb-policy-exempt-anon-blob"]).toBe("true");
        });

        it("should handle templates with no pre-existing tags", () => {
            const templateNoTags = {
                $schema: "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
                contentVersion: "1.0.0.0",
                resources: [
                    {
                        type: "Microsoft.Storage/storageAccounts",
                        name: "storageaccount",
                        location: "eastus",
                        apiVersion: "2020-08-01-preview",
                        sku: { name: "Standard_LRS", tier: "Standard" },
                        kind: "StorageV2",
                        properties: {
                            accessTier: "Hot",
                            supportsHttpsTrafficOnly: true,
                            minimumTlsVersion: "TLS1_2"
                        }
                        // No tags object
                    }
                ]
            };
            
            const result = applyAllowBlobPublicAccess(templateNoTags, true);
            const account = result.resources[0];
            
            expect(account.tags).toEqual({
                "hchb-policy-exempt-anon-blob": "true"
            });
        });
    });

    describe("normalizeAllowBlobPublicAccess edge cases", () => {
        it("should accept whitespace-trimmed strings", () => {
            expect(normalizeAllowBlobPublicAccess("  true  ")).toBe(true);
            expect(normalizeAllowBlobPublicAccess("  false  ")).toBe(false);
        });

        it("should accept mixed-case strings", () => {
            expect(normalizeAllowBlobPublicAccess("TRUE")).toBe(true);
            expect(normalizeAllowBlobPublicAccess("False")).toBe(false);
            expect(normalizeAllowBlobPublicAccess("TrUe")).toBe(true);
        });

        it("should reject empty string", () => {
            expect(() => normalizeAllowBlobPublicAccess("")).toThrow(
                "Invalid allowBlobPublicAccess value ''. Expected boolean true or false."
            );
        });

        it("should reject undefined and null at normalize level", () => {
            // These are handled at applyAllowBlobPublicAccess level as defaults,
            // but normalizeAllowBlobPublicAccess should reject them
            expect(() => normalizeAllowBlobPublicAccess(undefined)).toThrow();
            expect(() => normalizeAllowBlobPublicAccess(null)).toThrow();
        });
    });
});
