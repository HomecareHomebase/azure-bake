class agent {    
    get agentId() { return process.env.AGENT_ID; }
    get agentJobName() { return process.env.AGENT_JOBNAME; }
    get agentJobStatus() { return process.env.AGENT_JOBSTATUS; }
    get agentMachineName() { return process.env.AGENT_MACHINENAME; }
    get agentName() { return process.env.AGENT_NAME; }
    get agentOs() { return process.env.AGENT_OS; }
    get agentOsArchitecture() { return process.env.AGENT_OSARCHITECTURE; }    
}

class build {        
    get pullRequestID() { return process.env.SYSTEM_PULLREQUESTID; }
    get pullRequestSourceBranch() { return process.env.SYSTEM_PULLREQUEST_SOURCEBRANCH; }
    get pullRequestTargetBranch() { return process.env.SYSTEM_PULLREQUEST_TARGETBRANCH; }
    get sourceVersion() { return process.env.BUILD_SOURCEVERSION || '0.0.1'; }        
    get buildFor() { return process.env.BUILD_REQUESTEDFOR; }    
    get buildId() { return process.env.BUILD_BUILDID; }
    get buildNumber() { return process.env.BUILD_BUILDNUMBER; }
    get buildUri() { return process.env.BUILD_BUILDURI; }
    get buildDefinitionName() { return process.env.BUILD_DEFINITIONNAME; }
    get buildDefinitionVersion() { return process.env.BUILD_DEFINITIONVERSION; }
    get buildQueuedBy() { return process.env.BUILD_QUEUEDBY; }
    get buildQueuedById() { return process.env.BUILD_QUEUEDBYID; }    
    get buildReason() { return process.env.BUILD_REASON; }
    get buildRepositoryClean() { return process.env.BUILD_REPOSITORY_CLEAN; }
    get buildRepositoryGitSubmoduleCheckout() { return process.env.BUILD_REPOSITORY_GIT_SUBMODULECHECKOUT; }
    get buildRepositoryId() { return process.env.BUILD_REPOSITORY_ID; }    
    get buildRepositoryName() { return process.env.BUILD_REPOSITORY_NAME; }
    get buildRepositoryProvider() { return process.env.BUILD_REPOSITORY_PROVIDER; }
    get buildRepositoryTfvcWorkspace() { return process.env.BUILD_REPOSITORY_TFVC_WORKSPACE; }
    get buildRepositoryUri() { return process.env.BUILD_REPOSITORY_URI; }
    get buildRequestedForEmail() { return process.env.BUILD_REQUESTEDFOREMAIL; }
    get buildRequestedForId() { return process.env.BUILD_REQUESTEDFORID; }
    get buildSourceBranch() { return process.env.BUILD_SOURCEBRANCHNAME; } 
    get buildSourceTfvcShelveSet() { return process.env.BUILD_SOURCETFVCSHELVESET; }
    get buildSourceVersionMesage() { return process.env.BUILD_SOURCEVERSIONMESSAGE; }    
    get buildTriggeredByBuildId() { return process.env.BUILD_TRIGGEREDBY_BUILID; }
    get buildTriggeredByBuildNumber() { return process.env.BUILD_TRIGGEREDBY_BUILDNUMBER; }
    get buildTriggeredByDefintionId() { return process.env.BUILD_TRIGGEREDBY_DEFINITIONID; }
    get buildTriggeredByDefinitionName() { return process.env.BUILD_TRIGGEREDBY_DEFINITIONNAME; }
    get buildTriggeredByProjectId() { return process.env.BUILD_TRIGGEREDBY_PROJECTID; }      
}

class conditions {
    get isRunningOnADO() { return !!process.env.AGENT_ID; }
    get isLocalBuild() { return !process.env.AGENT_ID; }
    get isPullRequest() { !!process.env.SYSTEM_PULLREQUESTID; }
}

class docker {
    get dockerRegistry() { return `${process.env.DOCKER_REGISTRY}/` || ''; }
}

class options {
    get execOptions() {
        return {
            continueOnError: false, // default = false, true means don't emit error event
            pipeStdout: false, // default = false, true means stdout is written to file.contents
            customTemplatingThing: "test" // content passed to lodash.template()
        };
    }
    get execReporterOptions() {
        return {
            err: true, // default = true, false means don't write err
            stderr: true, // default = true, false means don't write stderr
            stdout: true // default = true, false means don't write stdout
        };
    }
}

class paths {    
    get agentBuildDirectory() { return process.env.AGENT_BUILDDIRECTORY; }
    get agentHomeDirectory() { return process.env.AGENT_HOMEDIRECTORY; }
    get agentToolsDirectory() { return process.env.AGENT_TOOLSDIRECTORY; }
    get agentWorkFolder() { return process.env.AGENT_WORKFOLDER; }    
    get artifactsDirectory() { return process.env.BUILD_ARTIFACTSTAGINGDIRECTORY || "./artifacts"; }
    get buildBinariesDirectory() { return process.env.BUILD_BINARIESDIRECTORY; }
    get buildRepositoryLocalPath() { return process.env.BUILD_REPOSITORY_LOCALPATH; }
    get buildSourcesDirectory() { return process.env.BUILD_SOURCESDIRECTORY; }
    get buildStagingDirectory() { return process.env.BUILD_STAGINGDIRECTORY; }
    get commonTestResultsDirectory() { return process.env.COMMON_TESTRESULTSDIRECTORY; }  
}

class release {
    get environmentName() { return process.env.RELEASE_ENVIRONMENTNAME; }
    get isLocalBuild() { return !process.env.AGENT_ID; }
}


class system {
    get pullRequestID() { return process.env.SYSTEM_PULLREQUESTID; }
    get pullRequestSourceBranch() { return process.env.SYSTEM_PULLREQUEST_SOURCEBRANCH; }
    get pullRequestTargetBranch() { return process.env.SYSTEM_PULLREQUEST_TARGETBRANCH || 'master'; }
    
}

exports.agent = new agent();
exports.build = new build();
exports.conditions = new conditions();
exports.docker = new docker();
exports.options = new options();
exports.paths = new paths();
exports.release = new release();
exports.system = new system();
