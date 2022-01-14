import {BatchPlugin} from './plugin'
import {BatchUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = BatchPlugin
exports.pluginNS = "@azbake/ingredient-batch"

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = BatchUtils
exports.functionsNS = "batch"
