"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require('util');
class RegistryServerAuthenticationToken {
    constructor(username, authenticationPassword, registry, email, xMetaSourceClient) {
        // Replace it with setvariable once azure-pipelines-task-lib is updated
        console.log("##vso[task.setvariable variable=CONTAINER_USERNAME;issecret=true;]" + username);
        console.log("##vso[task.setvariable variable=CONTAINER_PASSWORD;issecret=true;]" + authenticationPassword);
        this.registry = registry;
        this.password = authenticationPassword;
        this.username = username;
        this.email = email;
        this.xMetaSourceClient = xMetaSourceClient;
    }
    getUsername() {
        return this.username;
    }
    getPassword() {
        return this.password;
    }
    getLoginServerUrl() {
        return this.registry;
    }
    getEmail() {
        return this.email;
    }
    getDockerConfig() {
        var authenticationToken = new Buffer(this.username + ":" + this.password).toString('base64');
        console.log("##vso[task.setvariable variable=CONTAINER_AUTHENTICATIONTOKEN;issecret=true;]" + authenticationToken);
        var auths = util.format('{"auths": { "%s": {"auth": "%s", "email": "%s" } }, "HttpHeaders":{"X-Meta-Source-Client":"%s"} }', this.registry, authenticationToken, this.email, this.xMetaSourceClient);
        return auths;
    }
}
exports.default = RegistryServerAuthenticationToken;
