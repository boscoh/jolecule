#!/bin/bash

# Find the jolecule directroy
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

cd $DIR/electron

../node_modules/.bin/electron .

