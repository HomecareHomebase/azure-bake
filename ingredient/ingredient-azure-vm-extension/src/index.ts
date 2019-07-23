import { VirtualMachineExtensions} from './plugin'
import {VirtualMachineExtensionsUtils} from './functions'

exports.functions = VirtualMachineExtensionsUtils
exports.functionsNS = "vmextensionsutility" //bake.yaml expressions can access your functions via "myutils.my_function()"
