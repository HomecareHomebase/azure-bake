import {KubernetesPlugin} from './plugin'
import {K8sUtils} from './functions'

exports.plugin = KubernetesPlugin
exports.pluginNS = "@azbake/ingredient-kubernetes"

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = K8sUtils
exports.functionsNS = "k8s" //bake.yaml expressions can access your functions via "myutils.my_function()"
