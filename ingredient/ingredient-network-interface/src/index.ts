import {NetworkInterface} from './plugin'
import {NetworkInterfaceUtils} from './functions'

exports.plugin = NetworkInterface
exports.pluginNS = "@azbake/ingredient-network-interface" //name of the ingredient to reference in a bake.yaml recipe

exports.functions = NetworkInterfaceUtils
exports.functionsNS = "networkinterfaceutility" //bake.yaml expressions can access your functions via "myutils.my_function()"
