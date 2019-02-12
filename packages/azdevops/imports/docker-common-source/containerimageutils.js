"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function hasRegistryComponent(imageName) {
    var periodIndex = imageName.indexOf("."), colonIndex = imageName.indexOf(":"), slashIndex = imageName.indexOf("/");
    return ((periodIndex > 0 && periodIndex < slashIndex) ||
        (colonIndex > 0 && colonIndex < slashIndex));
}
exports.hasRegistryComponent = hasRegistryComponent;
function imageNameWithoutTag(imageName) {
    var endIndex = 0;
    if (hasRegistryComponent(imageName)) {
        // Contains a registry component that may include ":", so omit
        // this part of the name from the main delimiter determination
        endIndex = imageName.indexOf("/");
    }
    endIndex = imageName.indexOf(":", endIndex);
    return generateValidImageName(endIndex < 0 ? imageName : imageName.substr(0, endIndex));
}
exports.imageNameWithoutTag = imageNameWithoutTag;
function generateValidImageName(imageName) {
    imageName = imageName.toLowerCase();
    imageName = imageName.replace(/ /g, "");
    return imageName;
}
exports.generateValidImageName = generateValidImageName;
