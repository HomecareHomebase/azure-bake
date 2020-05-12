
export abstract class IdentifierBase {
    constructor(name: string, identifier: string) {
        this._name = name;
        this._identifier = identifier;
    }

    private _name: string;
    private _identifier: string;

    public get Name(): string {
        return this._name;
    }
    public get Identifier(): string {
        return this._identifier;
    }
}

export class VersionedIdentifierBase extends IdentifierBase {
    private _version: string;

    constructor(name: string, identifier: string, version: string) {
        super(name, identifier);
        this._version = version;
    }

    public get Version(): string {
        return this._version;
    }
}