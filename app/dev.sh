# install ttab using `npm i -g ttab`
# on mac, need to change
#   System Prefs -> Security -> Privacy -> Accessibility: add Terminal
ttab "cd node-koa; npm run serve"
ttab "cd vue; npm run dev"
sleep 0.5
open http://localhost:5200
