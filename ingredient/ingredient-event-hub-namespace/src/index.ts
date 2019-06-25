import { EventHubNamespacePlugin} from './plugin'
import { EventHubNamespaceUtils} from './functions'

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = EventHubNamespacePlugin
exports.pluginNS = "@azbake/ingredient-event-hub-namespace" //name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = EventHubNamespaceUtils
exports.functionsNS = "eventhubnamespace" //bake.yaml expressions can access your functions via "myutils.my_function()"

export {EventHubNamespaceUtils}
