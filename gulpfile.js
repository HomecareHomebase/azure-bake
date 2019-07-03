const argv = require('yargs');
const bump = require('gulp-bump');
const exec = require('child_process').exec;
const del = require('del');
const es = require('event-stream');
const fs = require('file-system');
const git = require('gulp-git');
const gulp = require('gulp');
const debug = require('gulp-debug');
const inlinesource = require('gulp-inline-source');
const moment = require('moment');
const rev = require('git-rev');
const shell = require('gulp-shell');

//Parameters and Variables
const params = require('./build/parameters');
let lerna = require('./lerna.json');

function adoPrep(done) {
    var branchName = params.build.buildSourceBranch;
    if (branchName !== 'master') {
        branchName = branchName.replace(/refs\/heads\/(feature\/)?/i, '');
    }
    var gitScript = `sudo git checkout ${branchName}`;
    console.log('ADO Prep Script: ' + gitScript);
    return runCmd(gitScript, done);
}

function build(done) {
    if (!!params.agent.agentId) {

        if ((!!params.build.buildReason.match(/IndividualCI/ig) || !!params.build.buildReason.match(/BatchedCI/ig)) &&
            !!params.build.buildSourceBranch.replace(/refs\/heads\/(feature\/)?/i, '').match(/master/ig)) {
            console.log('Running Azure DevOps Release Build');
            gulp.series(printVersion, adoPrep, toolInstall, lernaBuild, gitCommit, lernaPublish, systemPublish, tagAndPush)(done);
        }

        else if (!!params.build.buildReason.match(/PullRequest/ig)) {
            console.log('Running Azure DevOps Pull Request Build');
            gulp.series(printVersion, toolInstall, lernaBuild)(done);
        }

        else if (!!params.build.buildReason.match(/Manual/ig)) {
            console.log('Running Azure DevOps Manual Build');
            gulp.series(printVersion, toolInstall, lernaBuild)(done)
        }

        else {
            console.log('Running Inner Default Build');
            gulp.series(lernaBuild)(done);
        }
    }

    else {
        console.log('Running Outer Default Build');
        gulp.series(lernaBuild)(done);
    }
}

function cleanCoverage() {
    return del('coverage/**', { force: true });
}

function conditions(done) {
    console.log(`Build Conditions: `);
    console.log(`Is Agent? ${!!params.agent.agentId}`);
    var release = (!!params.build.buildReason.match(/IndividualCI/ig) || !!params.build.buildReason.match(/BatchedCI/ig)) &&
        !!params.build.buildSourceBranch.replace(/refs\/heads\/(feature\/)?/i, '').match(/master/ig);
    console.log(`Is Release Build? ${release}`);
    console.log(`Is Pullrequest? ${!!params.build.buildReason.match(/PullRequest/ig)}`);
    console.log(`Is Manual Build? ${!!params.build.buildReason.match(/manual/ig)}`);
    done();
}

function gitCommit(done) {
    var branchName = params.build.buildSourceBranch.replace(/refs\/heads\/(feature\/)?/i, '');
    var gitScript = `sudo git checkout ${branchName} && 
    sudo git config user.email "${params.build.buildRequestedForEmail}" &&
    sudo git config user.name "${params.build.buildRequestedFor}" &&
    sudo git add . && 
    sudo git commit --author '${params.build.buildRequestedFor} <${params.build.buildRequestedForEmail}>' --message "chore[skip ci]: Update & Commit Locks" && 
    sudo git tag v${lerna.version} &&
    sudo git push origin ${branchName} &&
    sudo git push origin --tags`;
    console.log('Git Script: ' + gitScript);
    return shell.task(gitScript)(done());
}

function inlineCoverageSource() {
    return gulp.src('./coverage/*.html')
        .pipe(inlinesource({ attribute: false }))
        .pipe(gulp.dest('./coverage/inline-html'));
}

function lernaBuild(done) {
    var gitScript = `sudo npm run clean:build`;
    console.log('Build Script: ' + gitScript);
    return runCmd(gitScript, done);
}

function lernaPublish(done) {
    var gitScript = `sudo npm run publish`;
    console.log('Build Script: ' + gitScript);
    return runCmd(gitScript, done);
}

function listEnvironment(done) {
    let envList = [];
    console.log(`Local Build Environment: ${params.conditions.isLocalBuild}`);
    console.log(`AzureDevOps Build Environment: ${params.conditions.isRunningOnADO}`);
    rev.branch(function (str) {
        let envKeys = Object.keys(params)
        envKeys.forEach(function (a) {
            let subKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(params[a]));
            for (let b = 1; b < subKeys.length; b++) {
                let c = params[a]
                if (!!(typeof (c[subKeys[b]])).match(/object/ig)) {
                    let lastKeys = Object.getOwnPropertyNames(c[subKeys[b]]);
                    lastKeys.forEach(function (d) {
                        envList.push({ Object: `${a}.${subKeys[b]}`, Key: d, Value: c[subKeys[b]][d] });
                    })
                } else if (c[subKeys[b]] != 'constructor') {
                    envList.push({ Object: a, Key: subKeys[b], Value: c[subKeys[b]] });
                }
            }
        })
        console.table(envList);
    });
    console.log(`\x1b[37m\x1b[40m`)
    done()
}

function printVersion(done) {
    var name = lerna.version;
    if (params.build.buildReason === 'PullRequest') {
        // pull requests will be [version]_[source branch name]
        const branchName = params.system.pullRequestSourceBranch;
        name += '_' + branchName.replace(/refs\/heads\/(feature\/)?/i, '');
    } else if (params.build.buildSourceBranch) {
        const branchName = params.build.buildSourceBranch;

        if (branchName !== 'master') {
            // all branches have refs/heads/ - we don't need that
            // we will also remove feature/ if it's there
            name += '_' + branchName.replace(/refs\/heads\/(feature\/)?/i, '');
        }
    }

    // make sure no illegal characters are there
    name = name.replace(/\"|\/|:|<|>|\\|\|\?|\@|\*/g, '_');

    // add YYYYMMDD_HHmm to mark the date and time of this build
    name += `_${moment().format('YYYYMMDD.HHmm')}`;

    console.log('##vso[build.updatebuildnumber]' + name);
    done();
}

function runCmd(command, done) {
    var child = exec(command);
    child.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });
    child.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    child.on('error', function (errors) {
        console.log('Comand Errors: ' + errors);
        throw(errors);
    });
    child.on('close', function (code) {
        console.log('closing code: ' + code);
        if (code != 0) { throw('Build failed with errors!'); }
        else { done(null, code); }
    });

}
function setupCoveragePool() {
    return gulp.src(["ingredinent/**/src/*.ts", "system/**/src/*.ts", "core/src/*.ts"]).pipe(writeFilenameToFile()).pipe(debug());
}

function sonarQube(done) {
    if (!params.agent.agentId) {
        console.log('Skipping SonarQube analysis for local build...');
        done();
    }
    else {
        let version = require('./package.json').version;
        //standard SonarQube configuration options
        let sonarOptions = {
            "sonar.projectName": "Azure-Bake",
            "sonar.projectKey": "azure-bake",
            "sonar.typescript.lcov.reportPaths": "coverage/lcov.info",
            "sonar.projectVersion": version,
            //"sonar.cpd.exclusions": "src/index.html, dist/index.html",
            "sonar.coverage.exclusions": "**/*.spec.ts, gulpfile.js, karma.conf.js, protractor.conf.js, **/node_modules/*"
        };

        //get source branch name
        let sourceBranch = (parameters.build.buildReason === 'PullRequest') ? parameters.build.pullRequestSourceBranch : parameters.build.sourceBranch;
        sourceBranch = sourceBranch.replace(/refs\/heads\//i, '');

        //if running from a pull request, add the target branch option
        if (parameters.build.buildReason === 'PullRequest') {
            sonarOptions["sonar.branch.target"] = parameters.build.pullRequestTargetBranch.replace(/refs\/heads\//i, '');
        }

        //if not running on the master branch, add the source branch option
        if (sourceBranch != 'master') {
            sonarOptions["sonar.branch.name"] = sourceBranch
        }

        sonarqubeScanner({
            serverUrl: "https://sonarqube.hchb.com",
            token: argv.sonarToken,
            options: sonarOptions
        }, done);
    }
}

function systemPublish(done) {
    var gitScript = `sudo npm run release-build --prefix ./system`;
    console.log('Build Script: ' + gitScript);
    return runCmd(gitScript, done);
}

function tagAndPush(done) {
    var imageVersion = JSON.parse(fs.readFileSync('lerna.json')).version;
    var imageTags = [`${params.docker.baseRepository}/bake:${imageVersion}`, `${params.docker.baseRepository}/bake:latest`];
    var result = imageTags.forEach( function (tag) {
        console.log(`Tagging docker image: bake:release with ${tag}`);
        let dockerScript = `docker image tag bake:release ${tag} && docker push ${tag}`;                
        runCmd(dockerScript, done);
    });
    done(null, result);
}

function testNycMocha(done) {
    return shell.task(['nyc mocha --opts test/mocha.opts'])(done());
}

function toolInstall(done) {
    var gitScript = `sudo npm install lerna@3.13.0 typescript@3.3.3 --global`;
    console.log('Tool Script: ' + gitScript);
    return runCmd(gitScript, done);
}

function writeFilenameToFile() {
    let output = fs.createWriteStream(__dirname + '/test/app.spec.ts');
    output.write('// I am an automatically generated file. I help ensure that unit tests have accurate code coverage numbers. You can ignore me.\n\n')
    //Return event-stream map to the pipeline
    return es.map((file, cb) => {
        let name = file.history[0];
        if (name) {
            name = name.replace(__dirname + '.').replace(/\\/g, '/');
            output.write('require(\'' + name + '\');\n');
        }
        //Callback signals the operation is done and returns the object to the pipeline
        cb(null, file);
    });
}

//Tasks
exports.build = build;
exports.conditions = conditions;
exports.commit = gitCommit;
exports.prep = adoPrep;
exports.analysis = gulp.series(sonarQube);
exports.cleancoverage = cleanCoverage;
exports.coverage = gulp.series(cleanCoverage, setupCoveragePool, testNycMocha);
exports.coveragesonarqube = gulp.series(cleanCoverage, setupCoveragePool, testNycMocha, sonarQube);
exports.inlinecoveragesource = inlineCoverageSource;
exports.listenvironment = listEnvironment;
exports.pretest = gulp.series(cleanCoverage, setupCoveragePool);
exports.printversion = printVersion;
exports.setupcoveragepool = setupCoveragePool;
exports.tagandpush = tagAndPush;
exports.testnycmocha = testNycMocha;