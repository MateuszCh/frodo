#!/bin/sh
# Run on the server (`npm run deploy`): pulls the code, builds, restarts. Build first, restart
# second – the new server expects the new build.
set -eu
cd "$(dirname "$0")"

# The pull may change this very script, so after it the new version runs from the start.
# --ff-only: the server clone never makes commits of its own, a diverged branch stops here.
if [ -z "${DEPLOY_PULLED:-}" ]; then
    git pull --ff-only
    DEPLOY_PULLED=1 exec sh "./$(basename "$0")" "$@"
fi

# Domain under which the app is registered on MyDevil (`devil www list`). Checked before
# building, so a missing entry does not leave a new build running on the old server.
domain=$(node -p "require('./config.json').deployDomain || ''")
if [ -z "$domain" ]; then
    echo 'deploy: "deployDomain" is missing in config.json' >&2
    exit 1
fi

npm install --omit=dev

# npm ci installs exactly what the lockfile pins. Here front/package-lock.json is gitignored
# (geosilesia keeps it in the repository), and without it npm install may pick newer versions.
if git ls-files --error-unmatch front/package-lock.json >/dev/null 2>&1; then
    (cd front && npm ci)
else
    echo 'deploy: front/package-lock.json is not in the repository, npm install may pick newer versions' >&2
    (cd front && npm install)
fi

# The running CMS serves front/public, so the build goes to tmp/ and replaces it only once it
# has succeeded: a failed or hung build leaves the current front end in place. With a plain
# path for --output-path the files land in its browser/ folder.
rm -rf tmp/front-build tmp/front-old
(cd front && npm run build -- --output-path ../tmp/front-build)
if [ -d front/public ]; then
    mv front/public tmp/front-old
fi
mv tmp/front-build/browser front/public
rm -rf tmp/front-build tmp/front-old

devil www restart "$domain"
