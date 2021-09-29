#!/usr/bin/env node
const child_process = require('child_process')
const path = require('path')
const _ = require('lodash')

function splitlines(s) {
  return s.split(/\n/)
}

function run(cmd, args) {
  console.log(`> ${cmd}`, args)
  const process = child_process.spawn(cmd, args, {shell:true})
  process.stdout.on('data', (data) => {
    const lines = splitlines(data.toString().slice(0, -1))
    for (let line of lines) {
      console.log(line)
    }
  });
  process.stderr.on('data', (data) => {
    for (let line of splitlines(data.toString().slice(0, -1))) {
      console.log(`stderr: ${line}`);
    }
  });
  process.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

const args = _.slice(process.argv, 2)
const cwd = process.cwd()

const electronAppDir = path.join(__dirname, 'app', 'electron')
process.chdir(electronAppDir)

const electron = path.join(__dirname, 'node_modules', 'electron', 'cli.js')
run(electron, _.concat([".", cwd], args))