import { VirtualMachineExtensions} from './plugin'
import {VirtualMachineExtensionsUtils} from './functions'

exports.plugin = VirtualMachineExtensions
exports.pluginNS = "@azbake/ingredient-azure-vm-extension" //name of the ingredient to reference in a bake.yaml recipe
exports.functions = VirtualMachineExtensionsUtils
exports.functionsNS = "vmextensionsutility" //bake.yaml expressions can access your functions via "myutils.my_function()"
