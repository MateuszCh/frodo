#!/bin/sh
cd /app/front && node_modules/.bin/gulp watch-docker &
exec /app/node_modules/.bin/nodemon --watch ./server --watch app.js app.js
