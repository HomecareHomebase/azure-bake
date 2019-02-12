"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const del = require("del");
const fs = require("fs");
const path = require("path");
const url = require("url");
const tl = require("azure-pipelines-task-lib/task");
const imageUtils = require("./containerimageutils");
const fileutils = require("./fileutils");
const os = require("os");
class ContainerConnection {
    constructor() {
        this.dockerPath = tl.which("docker", true);
    }
    createCommand() {
        var command = tl.tool(this.dockerPath);
        if (this.hostUrl) {
            command.arg(["-H", this.hostUrl]);
            command.arg("--tls");
            command.arg("--tlscacert='" + this.caPath + "'");
            command.arg("--tlscert='" + this.certPath + "'");
            command.arg("--tlskey='" + this.keyPath + "'");
        }
        return command;
    }
    execCommand(command, options) {
        var errlines = [];
        command.on("errline", line => {
            errlines.push(line);
        });
        return command.exec(options).fail(error => {
            errlines.forEach(line => tl.error(line));
            throw error;
        });
    }
    open(hostEndpoint, authenticationToken) {
        this.openHostEndPoint(hostEndpoint);
        this.openRegistryEndpoint(authenticationToken);
    }
    qualifyImageName(imageName) {
        if (!imageUtils.hasRegistryComponent(imageName) && this.registryAuth) {
            var regUrl = url.parse(this.registryAuth["registry"]), hostname = !regUrl.slashes ? regUrl.href : regUrl.host;
            if (hostname.toLowerCase() !== "index.docker.io") {
                imageName = hostname + "/" + imageName;
            }
        }
        return imageName;
    }
    close() {
        if (this.configurationDirPath && fs.existsSync(this.configurationDirPath)) {
            del.sync(this.configurationDirPath, { force: true });
        }
        if (this.certsDir && fs.existsSync(this.certsDir)) {
            del.sync(this.certsDir);
        }
    }
    setDockerConfigEnvVariable() {
        if (this.configurationDirPath && fs.existsSync(this.configurationDirPath)) {
            tl.setVariable("DOCKER_CONFIG", this.configurationDirPath, true);
        }
        else {
            tl.error(tl.loc('DockerRegistryNotFound'));
            throw new Error(tl.loc('DockerRegistryNotFound'));
        }
    }
    unsetDockerConfigEnvVariable() {
        var dockerConfigPath = tl.getVariable("DOCKER_CONFIG");
        if (dockerConfigPath) {
            tl.setVariable("DOCKER_CONFIG", "");
            del.sync(dockerConfigPath, { force: true });
        }
    }
    openHostEndPoint(hostEndpoint) {
        if (hostEndpoint) {
            this.hostUrl = tl.getEndpointUrl(hostEndpoint, false);
            if (this.hostUrl.charAt(this.hostUrl.length - 1) == "/") {
                this.hostUrl = this.hostUrl.substring(0, this.hostUrl.length - 1);
            }
            this.certsDir = path.join("", ".dockercerts");
            if (!fs.existsSync(this.certsDir)) {
                fs.mkdirSync(this.certsDir);
            }
            var authDetails = tl.getEndpointAuthorization(hostEndpoint, false).parameters;
            this.caPath = path.join(this.certsDir, "ca.pem");
            fs.writeFileSync(this.caPath, authDetails["cacert"]);
            this.certPath = path.join(this.certsDir, "cert.pem");
            fs.writeFileSync(this.certPath, authDetails["cert"]);
            this.keyPath = path.join(this.certsDir, "key.pem");
            fs.writeFileSync(this.keyPath, authDetails["key"]);
        }
    }
    openRegistryEndpoint(authenticationToken) {
        if (authenticationToken) {
            this.registryAuth = {};
            this.registryAuth["username"] = authenticationToken.getUsername();
            this.registryAuth["password"] = authenticationToken.getPassword();
            this.registryAuth["registry"] = authenticationToken.getLoginServerUrl();
            if (this.registryAuth) {
                this.configurationDirPath = this.getDockerConfigDirPath();
                process.env["DOCKER_CONFIG"] = this.configurationDirPath;
                var json = authenticationToken.getDockerConfig();
                var configurationFilePath = path.join(this.configurationDirPath, "config.json");
                if (fileutils.writeFileSync(configurationFilePath, json) == 0) {
                    tl.error(tl.loc('NoDataWrittenOnFile', configurationFilePath));
                    throw new Error(tl.loc('NoDataWrittenOnFile', configurationFilePath));
                }
            }
        }
    }
    getDockerConfigDirPath() {
        var configDir = path.join(this.getTempDirectory(), "DockerConfig_" + Date.now());
        this.ensureDirExists(configDir);
        return configDir;
    }
    ensureDirExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
            var privateKeyDir = path.join(dirPath, "trust", "private");
            tl.mkdirP(privateKeyDir);
        }
    }
    getTempDirectory() {
        return tl.getVariable('agent.tempDirectory') || os.tmpdir();
    }
}
exports.default = ContainerConnection;
