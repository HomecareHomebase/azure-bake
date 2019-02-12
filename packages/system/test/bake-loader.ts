import {expect} from 'chai'
import 'mocha'

import {BakePackage, IBakeEnvironment} from '../dist/bake-loader'

describe('package-loader', () => {

    beforeEach(()=> {
  
    })
  
    it('#load', () => {  

        process.env.BAKE_AUTH_SERVICE_ID = "id"
        process.env.BAKE_AUTH_SERVICE_KEY = "secret"

        var pkg = new BakePackage("./test/bake.yaml")
        expect(pkg).not.null
        expect(pkg.Environment).not.null
        expect(pkg.Environment.toolVersion).not.empty
        expect(pkg.Config.name).eq('test-package')
        expect(pkg.Config.shortName).eq('tstpkg')
        expect(pkg.Config.version).eq('1.0.0')

        expect(pkg.Environment.authentication).null
        expect(process.env.BAKE_AUTH_SERVICE_KEY).eq('')
    });

    it('#authenticate', ()=>{

        process.env.BAKE_AUTH_SERVICE_ID = "id"
        process.env.BAKE_AUTH_SERVICE_KEY = "secret"
        var pkg = new BakePackage("./test/bake.yaml")

        var status = pkg.Authenticate( (auth)=>
        {
            return (auth.serviceId == 'id' && auth.secretKey == 'secret')
        });
        expect(status).true

    });
  });