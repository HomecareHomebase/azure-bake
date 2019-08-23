import {PowershellDsc} from './plugin'
import {PowershellDscUtils} from './functions'

exports.plugin = PowershellDsc
exports.pluginNS = "@azbake/ingredient-powershell-dsc" //name of the ingredient to reference in a bake.yaml recipe
exports.functions = PowershellDscUtils
exports.functionsNS = "powershelldscutility" //bake.yaml expressions can access your functions via "myutils.my_function()"
