#!/usr/bin/env node

let doc = `
map_autodock.py [-u UPPER] [-s SKIP] main.pdb

- main.pdb  looks for autodock files for 'main.pdb' 
            (Ne, Ar, He, Rn, Xe, Kr) i.e.:
              - 'main.Ar.map'
              - 'main.Kr.map'
              - 'main.Xe.map'
- UPPER     upper cut-off of autodock grid-points (-0.5 is a good one)  
- SKIP      skips grids (1 - no skip, 2 shows every 2nd grid point, 
            3 shows every 3rd)
`;


const fs = require('fs-extra');
const nopt = require('nopt');
const _ = require('lodash');


function convertMapToFakeWatersPdb(
    autodockGrid, fakeWatersPdb, upperCutoff=-1, element="Xe", skip=1) {

  let isCoord = false;
  let vals = [];
  let nX, nY, nZ;
  let spacing;
  let center;
  let dim;

  console.log("Autodock:", autodockGrid);
  let text = fs.readFileSync(autodockGrid, 'utf8');
  let lines = text.split(/\r?\n/);
  for (let line of lines) {
      if (!isCoord) {
          let words = line.split(' ');
          if (words[0] == "SPACING") {
              spacing = parseFloat(words[1]);
              console.log("Grid-spacing:", spacing);
          } else if (words[0] == "NELEMENTS") {
              dim = _.map(words.slice(1, words.length), _.parseInt);
              console.log("Grid-dim:", dim);
              nX = dim[0] + 1;
              nY = dim[1] + 1;
              nZ = dim[2] + 1;
              console.log("Grid-points:", nX * nY * nZ);
          } else if (words[0] == "CENTER") {
              center = _.map(words.slice(1, words.length), parseFloat);
              console.log("Grid-center:", center);
              isCoord = true;
          }
      } else {
          vals.push(parseFloat(line));
      }
  }

  fs.writeFileSync('out.txt', JSON.stringify(vals, null, 2));

  let minV = _.min(vals);
  let maxV = _.max(vals);
  console.log(`E-limits: [${minV}, ${maxV}]`);

  console.log(`Output-pdb: ${fakeWatersPdb}`);

  let wstream = fs.createWriteStream(fakeWatersPdb);
  let iAtom = 0;
  for (let iVal=0; iVal < vals.length; iVal+=1) {
    let val = vals[iVal];
    if (val > upperCutoff) {
      continue;
    }
    let iX = iVal % nX;
    let iY = ((iVal - iX) / nX) % nY;
    let iZ = (iVal - iX - iY * nX) / nX / nY;
    if ((iX % skip > 0) || (iY % skip > 0) || (iZ % skip > 0)) {
      continue;
    }

    let x = (iX - nX / 2) * spacing + center[0];
    let y = (iY - nY / 2) * spacing + center[1];
    let z = (iZ - nZ / 2) * spacing + center[2];

    let s = "";
    s += "HETATM";
    s += _.padStart(iAtom.toString(), 5, ' ');
    s += " ";
    s += _.padEnd(element, 3, ' ');
    s += "  ";
    s += "XXX";
    s += " ";
    s += _.padStart(iAtom.toString(), 5, ' ');
    s += " ";
    s += "   ";
    s += _.padStart(x.toFixed(3), 8, ' ');
    s += _.padStart(y.toFixed(3), 8, ' ');
    s += _.padStart(z.toFixed(3), 8, ' ');
    s += _.padStart("1.00", 6, ' ');
    s += _.padStart((-val).toFixed(2), 6, ' ');
    s += "          ";
    s += element;

    wstream.write(s + '\n');

    iAtom += 1;
  }
  wstream.end();

  console.log(`N: ${iAtom} (E < ${upperCutoff})`);
}


function isFile(f) {
  try {
    return fs.lstatSync(f).isFile();
  }
  catch (e) {
    return false;
  }
}


let knownOpts = {
    "upper": [Number, null],
    "skip": [Number, null],
};
let shortHands = {
    "u": ["--upper"],
    "s": ["--skip"]
};
let parsed = nopt(knownOpts, shortHands, process.argv, 2);
let remain = parsed.argv.remain;

if (remain.length < 1) {
  console.log(doc);
} else {
  let pdb = remain[0];
  pdb = pdb.replace('.pdb', '')
  const elements = ['Ar', 'Kr', 'Xe', 'He', 'Ne'];
  for (let element of elements) {
    let autodockMap = `${pdb}.${element}.map`;
    if (isFile(autodockMap)) {
        convertMapToFakeWatersPdb(
          autodockMap, 
          `${pdb}.${element}.pdb`,
          upperCutoff=parsed.upper,
          element=element,
          skip=parsed.skip);
    } 
  }   
}
