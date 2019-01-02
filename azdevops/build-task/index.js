"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tl = __importStar(require("azure-pipelines-task-lib/task"));
const containerconnection_1 = __importDefault(require("docker-common/containerconnection"));
const acrauthenticationtokenprovider_1 = __importDefault(require("docker-common/registryauthenticationprovider/acrauthenticationtokenprovider"));
const genericauthenticationtokenprovider_1 = __importDefault(require("docker-common/registryauthenticationprovider/genericauthenticationtokenprovider"));
const imageUtils = __importStar(require("docker-common/containerimageutils"));
const sourceUtils = __importStar(require("docker-common/sourceutils"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
tl.setResourcePath(path.join(__dirname, 'task.json'));
class clitask {
    static runMain() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let registryType = tl.getInput("containerregistrytype", true);
                let authenticationProvider;
                if (registryType == "Azure Container Registry") {
                    authenticationProvider =
                        new acrauthenticationtokenprovider_1.default(tl.getInput("azureSubscriptionEndpoint"), tl.getInput("azureContainerRegistry"));
                }
                else {
                    authenticationProvider =
                        new genericauthenticationtokenprovider_1.default(tl.getInput("dockerRegistryEndpoint"));
                }
                let registryAuthenticationToken = authenticationProvider.getAuthenticationToken();
                // Connect to any specified container host and/or registry 
                const connection = new containerconnection_1.default();
                connection.open(tl.getInput("dockerHostEndpoint"), registryAuthenticationToken);
                const runtimeVersion = tl.getInput('runtimeVersion', true);
                const bakeFile = tl.getInput('bakeFile', true);
                const tags = tl.getDelimitedInput('tags', '\n');
                const useArtifact = tl.getBoolInput('useArtifact');
                let artifactOutput = "";
                let artifactTag = "";
                let useLatestTag = false;
                if (useArtifact) {
                    artifactOutput = tl.getInput('artifactOutput');
                    artifactTag = tl.getInput('artifactTag');
                    useLatestTag = tl.getBoolInput('useLatestTag');
                    if (!artifactOutput) {
                        throw new Error('Output folder for bake artifact must be set');
                    }
                    if (!useLatestTag && !artifactTag) {
                        throw new Error('Either the latest git tag or a specific tag must be defined');
                    }
                }
                let imageName = this.getImageName();
                let imageNames = [imageName];
                let imageMappings = this.getImageMappings(connection, imageNames, tags);
                if (useArtifact && useLatestTag) {
                    let tmpTags = new Array();
                    let tmpImageMappings = this.getImageMappings(connection, imageNames, tmpTags);
                    if (tmpImageMappings.length == 1)
                        throw new Error('There are no source code tags to use as the artifact tag');
                    artifactTag = tmpImageMappings[1].targetImageName;
                }
                else if (useArtifact) {
                    //fix up the input image name to include registry if needed, etc.
                    let qualifyImageName = tl.getBoolInput("qualifyImageName");
                    artifactTag = imageUtils.imageNameWithoutTag(imageName) + ":" + artifactTag;
                    artifactTag = qualifyImageName ? connection.qualifyImageName(artifactTag) : artifactTag;
                }
                let tmpDir = tl.getVariable('agent.tempdirectory');
                let toolPath = path.join(tmpDir, 'bake');
                console.log('Installing Bake cli tool');
                if (!fs.existsSync(toolPath)) {
                    tl.mkdirP(toolPath);
                }
                tl.execSync('npm', 'install azure-bake', {
                    cwd: toolPath,
                    silent: true
                });
                //executing bake mix
                let bakeTool = tl.tool('npx');
                let results = bakeTool.arg('bake').arg('mix')
                    .arg('--runtime=' + runtimeVersion)
                    .arg('--name=' + imageName)
                    .arg(bakeFile)
                    .exec({
                    cwd: toolPath
                });
                results.then((code) => {
                    if (code != 0) {
                        throw new Error();
                    }
                    //tag the base image 
                    console.log('Tagging bake recipe');
                    let firstMapping = imageMappings.shift() || {};
                    let promise = this.dockerTag(connection, firstMapping.sourceImageName, firstMapping.targetImageName);
                    imageMappings.forEach(mapping => {
                        promise = promise.then(() => this.dockerTag(connection, mapping.sourceImageName, mapping.targetImageName));
                    });
                    promise.then(() => {
                        //push all tags
                        console.log('Pushing bake recipe to remote registry');
                        imageMappings = this.getImageMappings(connection, imageNames, tags);
                        let firstImageMapping = imageMappings.shift() || {};
                        let promisePush = this.dockerPush(connection, firstImageMapping.targetImageName);
                        imageMappings.forEach(imageMapping => {
                            promisePush = promisePush.then(() => this.dockerPush(connection, imageMapping.targetImageName));
                        });
                        promisePush.then(() => {
                            //write the artifact file if set.
                            if (useArtifact) {
                                console.log('Generating artifact file against image tag ' + artifactTag);
                                tl.mkdirP(artifactOutput);
                                let artifactFile = path.join(artifactOutput, 'bake.artifact');
                                tl.writeFile(artifactFile, artifactTag);
                            }
                        });
                    });
                }, (err) => {
                    console.log(err);
                    throw new Error(err);
                });
            }
            catch (err) {
                console.error(err);
                tl.setResult(tl.TaskResult.Failed, err.message);
            }
        });
    }
    static getImageName() {
        var imageName = tl.getInput("imageName", true);
        return imageUtils.generateValidImageName(imageName);
    }
    static getImageMappings(connection, imageNames, additionalImageTags) {
        let qualifyImageName = tl.getBoolInput("qualifyImageName");
        let imageInfos = imageNames.map(imageName => {
            let qualifiedImageName = qualifyImageName ? connection.qualifyImageName(imageName) : imageName;
            return {
                sourceImageName: imageName,
                qualifiedImageName: qualifiedImageName,
                baseImageName: imageUtils.imageNameWithoutTag(qualifiedImageName),
                taggedImages: []
            };
        });
        let includeSourceTags = tl.getBoolInput("includeSourceTags");
        let sourceTags = [];
        if (includeSourceTags) {
            sourceTags = sourceUtils.getSourceTags();
        }
        // For each of the image names, generate a mapping from the source image name to the target image.  The same source image name
        // may be listed more than once if there are multiple tags.  The target image names will be tagged based on the task configuration.
        for (let i = 0; i < imageInfos.length; i++) {
            let imageInfo = imageInfos[i];
            imageInfo.taggedImages.push(imageInfo.qualifiedImageName);
            sourceTags.forEach(tag => {
                imageInfo.taggedImages.push(imageInfo.baseImageName + ":" + tag);
            });
            additionalImageTags.forEach(tag => {
                imageInfo.taggedImages.push(imageInfo.baseImageName + ":" + tag);
            });
        }
        // Flatten the image infos into a mapping between the source images and each of their tagged target images
        let sourceToTargetMapping = [];
        imageInfos.forEach(imageInfo => {
            imageInfo.taggedImages.forEach(taggedImage => {
                sourceToTargetMapping.push({
                    sourceImageName: imageInfo.sourceImageName,
                    targetImageName: taggedImage
                });
            });
        });
        return sourceToTargetMapping;
    }
    static dockerTag(connection, sourceImage, targetImage) {
        let command = connection.createCommand();
        command.arg("tag");
        command.arg(sourceImage);
        command.arg(targetImage);
        tl.debug(`Tagging image ${sourceImage} with ${targetImage}.`);
        return connection.execCommand(command);
    }
    static dockerPush(connection, image) {
        var command = connection.createCommand();
        command.arg("push");
        command.arg(image);
        return connection.execCommand(command);
    }
}
exports.clitask = clitask;
clitask.runMain();
