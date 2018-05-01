
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

a webstorm .

osascript 2>/dev/null <<EOF
    tell application "System Events"
        tell process "Terminal" to keystroke "t" using command down
    end
    tell application "Terminal"
        activate
        do script with command "cd \"$DIR/client\"; $*" in window 0
        do script with command "./hot-reload.sh" in window 0
    end
    tell application "System Events"
        tell process "Terminal" to keystroke "t" using command down
    end
    tell application "Terminal"
        activate
        do script with command "cd \"$DIR/nodeserver\"; $*" in window 0
        do script with command "./run_server.sh" in window 0
    end
    tell application "System Events"
        tell process "Terminal" to keystroke "t" using command down
    end
EOF
