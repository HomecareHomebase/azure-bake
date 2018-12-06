import {expect} from 'chai'
import 'mocha'

import cli from 'azcli-npm'
import {BakePackage} from '../dist/bake-loader'
import {BakeRunner} from '../dist/bake-runner'

describe('bake-runner', () => {

    beforeEach(()=> {
  
    })
  
    it('#authenticate', () => {  

        process.env.BAKE_AUTH_SERVICE_ID = "79d94f23-955c-4431-9b77-ea7e9c2565c3"
        process.env.BAKE_AUTH_SERVICE_KEY = "zfw3AYhVIn4AY6Mem9SaDVJ0j9+3SI1xxZrjxo5AFhg="
        process.env.BAKE_AUTH_TENATE_ID = "hchbazure.onmicrosoft.com"

        var pkg = new BakePackage("./test/bake.yaml")
        var azcli = new cli()
        var runner = new BakeRunner(pkg, azcli)

        var result = runner.login()
        expect(result).true

        runner.bake()   
        console.log(runner._package.Config.variables.get('test1').value)    
    });

  });