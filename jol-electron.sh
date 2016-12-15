#!/bin/bash

targetdir=`pwd`

# Find the jolecule directroy
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

cd $DIR/electron

if [ $# -eq 0 ]
  then
    electron .
  else
    electron . "$targetdir"/"$@"
fi

