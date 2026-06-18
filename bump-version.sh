#!/bin/bash
# Script pour incrémenter automatiquement la version

VERSION_FILE="./version.json"

# Extraire la version actuelle (ex: v24)
CURRENT=$(grep -o 'v[0-9]\+' "$VERSION_FILE" | head -1)
# Extraire le numéro (ex: 24)
NUM=${CURRENT#v}
# Incrémenter (ex: 25)
NEW_NUM=$((NUM + 1))
NEW_VERSION="v$NEW_NUM"

# Timestamp actuel en ISO
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Mettre à jour version.json
cat > "$VERSION_FILE" <<EOF
{
  "version": "1.0.${NEW_NUM}",
  "cacheVersion": "${NEW_VERSION}",
  "lastUpdated": "${TIMESTAMP}"
}
EOF

echo "✅ Version mise à jour : ${NEW_VERSION}"
echo "📅 Timestamp : ${TIMESTAMP}"
