import {KeyVaultPlugin} from './plugin'
import {KeyVaultUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = KeyVaultPlugin
exports.pluginNS = "@azbake/ingredient-key-vault" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = KeyVaultUtils
exports.functionsNS = "keyvaultutils" //bake.yaml expressions can access your functions via "myutils.my_function()"
