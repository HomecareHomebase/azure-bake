import { IPropertyConfiguration, ISecretConfiguration } from "."; //, IEncryptionKeyConfiguration, ICertificateConfiguration } from ".";

export class PropertyServiceConfiguration {

    private _properties: IPropertyConfiguration | null = null;
    private _secrets: ISecretConfiguration | null = null;
    //private _encryptionKeys: IEncryptionKeyConfiguration | null = null;
    //private _certificates: ICertificateConfiguration | null = null;

    public get PropertyConfiguration(): IPropertyConfiguration | null {
        return this._properties;
    }
    public set PropertyConfiguration(value: IPropertyConfiguration | null) {
        this._properties = value;
    }

    public get SecretConfiguration(): ISecretConfiguration | null {
        return this._secrets;
    }
    public set SecretConfiguration(value: ISecretConfiguration | null) {
        this._secrets = value;
    }

    // public get EncryptionKeyConfiguration(): IEncryptionKeyConfiguration | null {
    //     return this._encryptionKeys;
    // }
    // public set EncryptionKeyConfiguration(value: IEncryptionKeyConfiguration | null) {
    //     this._encryptionKeys = value;
    // }

    // public get CertificateConfiguration(): ICertificateConfiguration | null {
    //     return this._certificates;
    // }
    // public set CertificateConfiguration(value: ICertificateConfiguration | null) {
    //     this._certificates = value;
    // }

    public get Count(): number {
        return this.PropertyCount + this.SecretCount;// + this.EncryptionKeyCount + this.CertificateCount;
    }

    public get PropertyCount(): number {
        return this.PropertyCreateCount + this.PropertyUpdateCount + this.PropertyDeleteCount
    }
    public get PropertyCreateCount(): number {
        return (this._properties == null || this._properties.create == null) ? 0 : this._properties.create.length;
    }
    public get PropertyUpdateCount(): number {
        return (this._properties == null || this._properties.update == null) ? 0 : this._properties.update.length;
    }
    public get PropertyDeleteCount(): number {
        return (this._properties == null || this._properties.delete == null) ? 0 : this._properties.delete.length;
    }

    public get SecretCount(): number {
        return this.SecretCreateCount + this.SecretUpdateCount + this.SecretDeleteCount
    }
    public get SecretCreateCount(): number {
        return (this._secrets == null || this._secrets.create == null) ? 0 : this._secrets.create.length;
    }
    public get SecretUpdateCount(): number {
        return (this._secrets == null || this._secrets.update == null) ? 0 : this._secrets.update.length;
    }
    public get SecretDeleteCount(): number {
        return (this._secrets == null || this._secrets.delete == null) ? 0 : this._secrets.delete.length;
    }

    // public get EncryptionKeyCount(): number {
    //     return this.EncryptionKeyCreateCount + this.EncryptionKeyUpdateCount + this.EncryptionKeyDeleteCount;
    // }
    // public get EncryptionKeyCreateCount(): number {
    //     return (this._encryptionKeys == null || this._encryptionKeys.create == null) ? 0 : this._encryptionKeys.create.length;
    // }
    // public get EncryptionKeyUpdateCount(): number {
    //     return (this._encryptionKeys == null || this._encryptionKeys.update == null) ? 0 : this._encryptionKeys.update.length;
    // }
    // public get EncryptionKeyDeleteCount(): number {
    //     return (this._encryptionKeys == null || this._encryptionKeys.delete == null) ? 0 : this._encryptionKeys.delete.length;
    // }

    // public get CertificateCount(): number {
    //     return this.EncryptionKeyCreateCount + this.CertificateUpdateCount + this.CertificateDeleteCount;
    // }
    // public get CertificateCreateCount(): number {
    //     return (this._certificates == null || this._certificates.create == null) ? 0 : this._certificates.create.length;
    // }
    // public get CertificateUpdateCount(): number {
    //     return (this._certificates == null || this._certificates.update == null) ? 0 : this._certificates.update.length;
    // }
    // public get CertificateDeleteCount(): number {
    //     return (this._certificates == null || this._certificates.delete == null) ? 0 : this._certificates.delete.length;
    // }

    public get HasValues(): boolean {
        return (this.PropertyCount + this.SecretCount) > 0;// + this.EncryptionKeyCount + this.CertificateCount) > 0;
    }
}