# install ttab using `npm i -g ttab`
# on mac, need to change
#   System Prefs -> Security -> Privacy -> Accessibility: add Terminal
ttab "npm run serve-dev"
ttab "npm run client-dev"
sleep 0.5
open http://localhost:5200
