#!/usr/bin/env node
var fs = require('fs')
const path = require("path");
var minimist = require('minimist')
const  series = require('async/series');
// var through = require('through2')
var fasta = require('bionode-fasta')
const {processGenomeFile, fetchRecords, getDbPath, makeDB} = require("./server/handleGenomeDbs");

var argv = minimist(process.argv.slice(2), {
  boolean: ['path', 'file'],
  alias: {
    file: 'f',
    path: 'p'
  }
})

if (argv.help) {
  console.log(
    'Usage: makedb <options> <fasta file [required]> <output file>\n\n' +
    'You can also use fasta files compressed with gzip\n' +
    'If no output is provided, the result will be printed to stdout\n\n' +
    'Options: -p, --path: Includes the path of the original file as a property of the output objects\n\n'
  )
}

var options = {
  includePath: argv.path,
  filenameMode: false // single fasta file, not a list of fasta files
}

var output = argv._[1] ? fs.createWriteStream(argv._[1]) : process.stdout

// var parser = argv.write ? fasta.write() : fasta(options, argv._[0])
const fastaFile = argv._[0]
const dbRoot = path.join(path.dirname(fastaFile), "genomeDbs")
const dbPath = getDbPath(fastaFile)

var { promisify } = require('util');
var writeFile = promisify(fs.writeFile);
var unlink = promisify(fs.unlink);
var beep = () => process.stdout.write("\x07");

var delay = (seconds) => new Promise((resolves) => {
  setTimeout(resolves, seconds*1000);
})

makeDB(dbRoot, fastaFile))
fetchRecords(['Wuhan/WIV02/2019', 'Wuhan/IVDC-HB-GX02/2019'], dbPath))

const ds = () => Promise.resolve()
  .then(() => console.log("starting ... "))
  .then(() => console.log("step 2 ... "))
  .then(() => makeDB(dbRoot, fastaFile))
  .then(() => fetchRecords(['Wuhan/WIV02/2019', 'Wuhan/IVDC-HB-GX02/2019'], dbPath))
  .then((docs) => {
    docs.map((rec) => {console.log(rec.id)})
  })
  .then(() => console.log("ended. "))

ds()
//
// const tasks = [
//   processGenomeFile(dbRoot, fastaFile),
//   fetchRecords(['Wuhan/WIV02/2019', 'Wuhan/IVDC-HB-GX02/2019'], dbPath)
//     .exec((err, docs) =>{
//       docs.map((rec) => {console.log(rec.id)})
//     })
// ]
// series(tasks)
//

