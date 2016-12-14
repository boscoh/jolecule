#!/bin/bash

# Find the jolecule directroy
DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

cd $DIR/electron

../node_modules/.bin/electron .

# # Close terminal if the command was run from Finder
# if [ "$(uname)" == "Darwin" ]; then
#   echo -n -e "]0;jol-electron.shell"
#   osascript -e 'tell application "Terminal" to close (every window whose name contains "jol-electron.shell")' &
# fi
