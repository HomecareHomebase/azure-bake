import { AzureVm } from './plugin'
import { AzureVmUtils } from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = AzureVm
exports.pluginNS = "@azbake/ingredient-azure-vm" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = AzureVmUtils
exports.functionsNS = "vm" //bake.yaml expressions can access your functions via "myutils.my_function()"