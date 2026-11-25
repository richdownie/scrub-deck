#!/bin/bash
# Build the web app and publish dist/ to the gh-pages branch (GitHub Pages).
# Pushes as the richdownie GitHub account that `gh` is logged into on this Mac.
set -e
cd "$(dirname "$0")"
npm run build
auth="Authorization: Basic $(printf 'x-access-token:%s' "$(gh auth token --user richdownie)" | base64)"
tmp=$(mktemp -d)
cp -R dist/. "$tmp"
touch "$tmp/.nojekyll"
cd "$tmp"
git init -q -b gh-pages
git add -A
git -c commit.gpgsign=false commit -q -m "Publish web build"
git -c credential.helper= -c "http.extraheader=$auth" push -q -f https://github.com/richdownie/scrub-deck.git gh-pages
rm -rf "$tmp"
echo "published"
