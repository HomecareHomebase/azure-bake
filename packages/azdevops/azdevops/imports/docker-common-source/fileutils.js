"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const tl = require("azure-pipelines-task-lib/task");
// http://www.daveeddy.com/2013/03/26/synchronous-file-io-in-nodejs/
// We needed a true Sync file write for config file
function writeFileSync(filePath, data) {
    try {
        const fd = fs.openSync(filePath, 'w');
        var bitesWritten = fs.writeSync(fd, data);
        fs.fsyncSync(fd);
        tl.debug(tl.loc("FileContentSynced", data));
        fs.closeSync(fd);
        return bitesWritten;
    }
    catch (e) {
        tl.error(tl.loc('CantWriteDataToFile', filePath, e));
        throw e;
    }
}
exports.writeFileSync = writeFileSync;
