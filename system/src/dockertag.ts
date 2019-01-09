#!/usr/bin/env node
import {ShellRunner} from "azcli-npm"

let version = require('../package.json').version

let name="bake"
let srcversion="release"
let prefix="homecarehomebase"

let shell = new ShellRunner("docker").start()
shell.arg('tag').arg(name+":"+srcversion).arg(prefix+"/"+name+":"+version).exec()

shell = new ShellRunner("docker").start()
shell.arg('tag').arg(name+":"+srcversion).arg(prefix+"/"+name+":latest").exec()

shell = new ShellRunner("docker").start()
shell.arg('push').arg(prefix+"/"+name+":latest").exec()

shell = new ShellRunner("docker").start()
shell.arg('push').arg(prefix+"/"+name+":"+version).exec()
