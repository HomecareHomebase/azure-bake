import { VersionedIdentifierBase } from ".";

export class SecretIdentifier extends VersionedIdentifierBase {
    constructor(name: string, identifier: string, version: string) {
        super(name, identifier, version);
    }
}
