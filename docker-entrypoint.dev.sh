#!/bin/sh
# Dev: Angular dev server (API proxy to backend) on 3002 + nodemon backend on 3000.
cd /app/front && npm start -- --host 0.0.0.0 --port 3002 --proxy-config proxy.conf.json &
exec /app/node_modules/.bin/nodemon --watch ./server --watch app.js app.js
