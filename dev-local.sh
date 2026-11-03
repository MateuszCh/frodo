#!/bin/sh
# Local development without Docker (`npm run dev`): both watchers in one terminal – the Angular
# dev server on :4200 (`npm start` in front/, proxying /api, /user, /uploads and /export to
# :3000) and the backend on :3000 (`npm run watch` in the root), which nodemon restarts after
# every change in server/ or app.js. MongoDB is not started here: `mongoUrl` in config.json
# must point to a running one. Ctrl+C stops both; so does either one exiting.
set -eu
cd "$(dirname "$0")"

# Job control: each watcher runs in its own process group, so the whole group – npm, ng or
# nodemon and the node process under it – can be stopped at once.
set -m

(cd front && exec npm start) &
front=$!
npm run watch &
back=$!

stop() {
    trap - INT TERM EXIT
    kill -TERM -- "-$front" "-$back" 2>/dev/null || true
    wait 2>/dev/null || true
}
trap stop INT TERM EXIT

while kill -0 "$front" 2>/dev/null && kill -0 "$back" 2>/dev/null; do
    sleep 1
done
