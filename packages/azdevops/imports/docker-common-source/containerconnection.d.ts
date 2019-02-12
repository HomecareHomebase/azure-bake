import * as tr from "azure-pipelines-task-lib/toolrunner";
import AuthenticationToken from "./registryauthenticationprovider/registryauthenticationtoken";
export default class ContainerConnection {
    private dockerPath;
    protected hostUrl: string;
    protected certsDir: string;
    private caPath;
    private certPath;
    private keyPath;
    private registryAuth;
    private configurationDirPath;
    constructor();
    createCommand(): tr.ToolRunner;
    execCommand(command: tr.ToolRunner, options?: tr.IExecOptions): any;
    open(hostEndpoint?: string, authenticationToken?: AuthenticationToken): void;
    qualifyImageName(imageName: string): string;
    close(): void;
    setDockerConfigEnvVariable(): void;
    unsetDockerConfigEnvVariable(): void;
    private openHostEndPoint;
    protected openRegistryEndpoint(authenticationToken?: AuthenticationToken): void;
    private getDockerConfigDirPath;
    private ensureDirExists;
    private getTempDirectory;
}
