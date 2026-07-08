#!/bin/bash
# Copie les fichiers à livrer dans www/ (webDir Capacitor).
# N'inclut ni node_modules, ni docs/, ni les scripts de dev.
set -e

rm -rf www
mkdir -p www

cp index.html manifest.json sw.js version.json privacy.html \
   audio.js data.js render.js state.js onboarding.js shaker.js shaker.html \
   www/

cp -R assets www/assets

echo "www/ généré."
