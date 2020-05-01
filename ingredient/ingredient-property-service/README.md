# Changelogs
* [@azbake/ingredient-property-service](./CHANGELOG.md)

# Overview
The Property Service ingredient is a plugin for bake.  When included in a recipe, this plugin will allow the pipeline to add properties, secrets, encryption keys, and secrets to the property service.

# Usage

## Property Service Configuration
When you have an application that requires deployment to Kubernetes, you should start by writing a [Kubernetes configuration](https://kubernetes.io/docs/concepts/cluster-administration/manage-deployment/), which normally takes the form of a yaml file. Once this file exists, a bake recipe should be written that points at the file. To do this, the recipe must contain an ingredient of type "@azbake/ingredient-kubernetes". The ingredient's `source` field will specify the Kubernetes configuration. This field accepts a path to a file, a url to a file or a path to a directory that contains multiple Kubernetes configuration files.

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
        testDeployment: true
~~~

