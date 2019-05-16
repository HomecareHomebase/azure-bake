#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'

function createSymbolicLink(src: fs.PathLike, dest: fs.PathLike): void {
  
    fs
      .lstat(dest, (e,s)=>{
           if (!e) {
               fs.unlinkSync(dest)
           }

           fs.symlinkSync(src, dest, "junction")
      })
  }

  let ingredient_dir = __dirname + "/../../ingredient"
  let node_module_dir = __dirname + "/../node_modules"

  let dirs = fs.readdirSync(ingredient_dir).filter(f=> fs.statSync(path.join(ingredient_dir, f)).isDirectory())

  dirs.forEach(dir=>{

    let packageFile = path.join(ingredient_dir, dir, "package.json")
    try{

        let content = fs.readFileSync(packageFile).toString('utf-8')
        let json = JSON.parse(content)
        let name = json.name

        createSymbolicLink(path.join(ingredient_dir, dir),  path.join(node_module_dir, name))

    }
    catch(e){
        console.log(e)
    }

  })
