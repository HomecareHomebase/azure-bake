# Changelogs
* [@azbake/ingredient-kubernetes](./CHANGELOG.md)

# Overview
The Kubernetes ingredient is a plugin for bake.  When included in a recipe, this plugin will _apply_ a specified configuration against a cluster. Kubernetes configurations to be applied are specified in the `source` of the ingredient (see Limitations). Serve-time token replacement inside the configurations is supported.

# Usage
## Kubernetes Configuration
When you have an application that requires deployment to Kubernetes, you should start by writing a [Kubernetes configuration](https://kubernetes.io/docs/concepts/cluster-administration/manage-deployment/), which normally takes the form of a yaml file. Once this file exists, a bake recipe should be written that points at the file. To do this, the recipe must contain an ingredient of type "@azbake/ingredient-kubernetes". The ingredient's `source` field will specify the Kubernetes configuration. This field accepts a path to a file, a url to a file or a path to a directory that contains multiple Kubernetes configuration files.

## Kubernetes Cluster
The above configuration will be _applied_ to a Kubernetes cluster. The ingredient needs information about that cluster. We provide that information in the form of a [kubeconfig](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/) file. Once the file is created, we need to let the ingredient know about it. To do this, the contents of the file must be Base64 encoded and passed in as an ingredient parameter called `kubeconfig`. Since this varies by environment, there's no point in hardcoding the actual value there. To solve this, the value of the `kubeconfig` parameter is typically an expression which calls `coreutils.variable()` to get the value of a [Bake Variable](../../azure-bake#bake-environment-structureterms).
Note: The `current-context` field in the kubeconfig file must be set, as this is what's used in the non-interactive serving of the ingredient. There is therefore no benefit to including more than one context (or cluster or user or namespace) in a kubeconfig. If you want to deploy to multiple namespaces, the easiest way to do so is with multiple kubeconfigs and therefore either multiple ingredients calling `coreutils.variable()` for different variables, or multiple calls to Bake Serve from ADO.

## Token Replacement
The Kubernetes Configurations specified will undergo token replacement. To embed a token in a file, surround it with double curly braces and uppercase it (e.g., "{{MYTOKEN}}"). As long as "myToken" (in any combination of upper or lower case) is the key of a Bake Variable (with ingredient-level _tokens_ taking precedence over recipe-level _variables_, and environment-level _BAKE_VARIABLES64_ taking precedence over both), then the token will be substituted for that variable's value. Note that the value can be a Bake Expression which will be evaluated immediately before substitution.

### Notes
This happens on-disk. This means it is ineffective against URL-specified configurations. It also means that it can only happen once during a serve. The original, non-token replaced versions of the files are not kept. The easiest way to use different values for a token in different scenarios is to make multiple calls to Bake Serve from ADO. This will ensure the container serving the recipe is destroyed and started anew for each set of token values.

# Example Recipe
~~~yaml
name: My Package
shortName: mpkg
version: "0.0.1"
resourceGroup: false
variables:
  someToken: I will lose out to the below value of 'someToken'
ingredients: 
  - "@azbake/ingredient-kubernetes@~0"
recipe: 
  k8s: 
    properties: 
      type: "@azbake/ingredient-kubernetes"
      source: subdir
      tokens:
        someToken: I take precedence over the above value of 'someToken'
        someOtherToken: some value
      parameters:
        kubeconfig : ["coreutils.variable('b64KubeConfigContent')"]
        testDeployment: true #set this to true and after the source has been applied, it will get deleted (good for deployment testing)
        deleteDeployment: false # not required, and if set to true it will execute a kubectl delete instead of a kubectl apply on the subdir (ignoring anything not found)
~~~
# Limitations
* Token replacement will not happen against URLs specified as the `source` of the ingredient.

# Testing
If you just want to deploy and then delete some resources for testing, provide a value of `true` for the `testDeployment` parameter of the ingredient.