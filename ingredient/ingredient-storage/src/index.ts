import {StoragePlugIn} from './plugin'
import { StorageUtils } from './functions'

exports.plugin = StoragePlugIn
exports.pluginNS = "@azbake/ingredient-storage"

exports.functions = StorageUtils
exports.functionsNS = "storage"
