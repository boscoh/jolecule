#!/bin/bash

targetdir=`pwd`

# Find the jolecule directroy
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

cd $DIR/electron

if [ $# -eq 0 ]
  then
    ./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .
  else
    ./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron . -f "$targetdir" "$@"
fi

