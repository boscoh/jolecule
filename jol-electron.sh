# Store the START_DIR to append to filenames
START_DIR=$(PWD)
echo $START_DIR

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd $SCRIPT_DIR

cd app/electron

npm run start "$START_DIR" "$1"
