import {ContainerRegPlugin} from './plugin'
// import {ContainerRegUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = ContainerRegPlugin
exports.pluginNS = "@azbake/ingredient-container-reg" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
// exports.functions = ContainerRegUtils
// exports.functionsNS = "containerreg" //bake.yaml expressions can access your functions via "myutils.my_function()"
