const fs = require('fs');
const path = require("path");
const through = require('through2');
const {PassThrough} = require('stream');
const Engine = require('nedb');
const fasta = require('bionode-fasta');
const bodyParser = require('body-parser');

const { promisify } = require('util');
const { findAvailableSecondTreeOptions } = require('./getDatasetHelpers');

const readdir = promisify(fs.readdir);

/*
All NeDB database files are stored in the subdirectory 'genomeDbs'
at the same level where fasta file and auspice file is located.
 */
const getDbPath = (fastaPath) => {
  const dbRoot = path.join(path.dirname(fastaPath), 'genomeDbs');
  const dbPath = path.join(dbRoot,
    path.basename(fastaPath).replace(".fasta", ".db"));
  return dbPath;
};

/*
@param: ids: an array of sequence ids
@param: dbPath: resolvable path to NeDB database of genome sequences
 */
const fetchRecords = (ids, dbPath) =>
  new Promise((resolve, reject) => {
    console.log("dbPath: " + dbPath);
    const db = new Engine({filename: dbPath, autoload: true});
    if (db) {
      console.log("db connected");
      db.find({id: {$in: ids}}, (err, docs) => {
        if (err) {
          console.log('EE');
          reject(err);
        } else if (docs.length == 0) {
          console.log("No record found!");
          resolve(docs);
        } else {
          console.log("records: " + docs.length);
          resolve(docs);
        }
      });
    }
  });


const getGenomeDB = ({datasetsPath}) => {
  return async (req, res) => { // eslint-disable-line consistent-return
    try {
      
      var prefix = req.body.prefix
        .replace(/^\//, '')
        .replace(/\/$/, '')
        .split("/")
        .join("_");
      if (!req.body.ids || req.body.ids.length === 0) {
        res.setHeader('Content-Type', 'application/json');
        if (fs.existsSync('data/genomeDbs/' + prefix + '.db')) {
          res.end(JSON.stringify({result: true}));
        } else {
          res.end(JSON.stringify({result: false}));
        }
        return;
      }
      res.setHeader('Content-Type', 'text/plain');
      var db = await fetchRecords(req.body.ids, 'data/genomeDbs/' + prefix + '.db');
      db.forEach(v=> {
          res.write('>' + v.id + '\n');
          res.write(v.seq + '\n');
      })
      res.end();
    } catch (err) {
      console.trace(err);
    }
  };
};

/*
@param: dbRoot: path to directory where genome database should be saved
@param: fastaPath: path to fasta file to use as input to create database

Database will overwrite existing database files to avoid duplicates.
TODO: Maybe do something else to prevent unexpected data loss
 */
async function processGenomeFile(dbRoot, fastaPath) {
  process.stdin.setEncoding('utf8');

  if (!fs.existsSync(dbRoot)) {
    fs.mkdirSync(dbRoot);
  }
  const dbPath = getDbPath(fastaPath);

  if (fs.existsSync(dbPath)) {
    fs.unlink(dbPath, () => { console.log(`Overwrote ${dbPath} with new data!`);});
  }

  const processRecord = new PassThrough();
  const db = new Engine({filename: dbPath, autoload: true});
  let rc = 0;

  processRecord.on('data', (rec) => {
    obj = JSON.parse(rec);
    const wrappedSeq = obj.seq.match(/.{1,80}/g).join('\n') + '\n';
    const outrec = {id: obj.id, seq: wrappedSeq, source: fastaPath};
    db.insert(outrec);
    rc++;
  });

  processRecord.on('end', () =>
    console.log(`Total added: ${rc} seqs`)
  );
  const rs = fs.createReadStream(fastaPath);
  rs.pipe(fasta())
    .pipe(processRecord);
}

const prepareDB = async (path) => {
  try {
    const files = await readdir(path);
    const v2Files = files.filter((file) => (
      file.endsWith(".fasta")
    ));
    v2Files.forEach((v) => {
      makeDB(path, path + '/' + v);
    });


  } catch (err) {
    // utils.warn(`Couldn't collect available dataset files (path searched: ${path})`);
    // utils.verbose(err);
  }
};

const makeDB = (dbRoot, fastaPath) => new Promise((resolve, reject) => {

  process.stdin.setEncoding('utf8');

  if (!fs.existsSync(dbRoot)) {
    fs.mkdirSync(dbRoot);
  }
  const dbPath = getDbPath(fastaPath);

  if (fs.existsSync(dbPath)) {
    fs.unlink(dbPath, () => { console.log(`Overwrote ${dbPath} with new data!`);});
  }

  const processRecord = new PassThrough();
  const db = new Engine({filename: dbPath, autoload: true});
  let rc = 0;

  processRecord.on('data', (rec) => {
    obj = JSON.parse(rec);
    const wrappedSeq = obj.seq.match(/.{1,80}/g).join('\n') + '\n';
    const outrec = {id: obj.id, seq: wrappedSeq, source: fastaPath};
    db.insert(outrec);
    rc++;
  });

  processRecord.on('end', () => {
    console.log(`Total added: ${rc} seqs`);
    if (fs.existsSync(dbPath)) {
      resolve();
    } else {
      reject(`File: ${dbPath} was not created.`);
    }
  }
  );
  const rs = fs.createReadStream(fastaPath);
  rs.pipe(fasta())
    .pipe(processRecord);

});
module.exports = {
  processGenomeFile,
  fetchRecords,
  getDbPath,
  makeDB,
  prepareDB,
  getGenomeDB
};
