// import { Logger } from "@azbake/core";

// import { OperationBase } from ".";
// import { ICertificateCreateConfiguration, ICertificateUpdateConfiguration, ICertificateDeleteConfiguration, ICertificateConfiguration } from "../configuration";
// import { CertificateClient } from "../client"

// export class CertificateOperation extends OperationBase<ICertificateCreateConfiguration, ICertificateUpdateConfiguration, ICertificateDeleteConfiguration> {

//     private readonly _client: CertificateClient;

//     constructor(logger: Logger, client: CertificateClient, configuration: ICertificateConfiguration) {
//         super(logger, configuration)
//         this._client = client;
//     }

//     get TypeName(): string {
//         return 'Certificate';
//     }

//     protected async Create(index: number, configuration: ICertificateCreateConfiguration): Promise<void> {
//     }
//     protected async Update(index: number, configuration: ICertificateUpdateConfiguration): Promise<void> {
//     }
//     protected async Delete(index: number, configuration: ICertificateDeleteConfiguration): Promise<void> {
//     }
// }
