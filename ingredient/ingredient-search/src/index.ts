import { SearchPlugIn } from './plugin'
import { SearchUtils } from './functions'

exports.plugin = SearchPlugIn
exports.pluginNS = "@azbake/ingredient-search"

exports.functions = SearchUtils
exports.functionsNS = "search"
