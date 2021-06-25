# install ttab using `npm i -g ttab`
# on mac, need to change
#   System Prefs -> Security -> Privacy -> Accessibility: add Terminal
ttab "cd node-koa; npm run start"
ttab "cd vue-client; npm run dev"
sleep 0.5
open http://localhost:5200
