#!/usr/bin/env node
/**
 * Script de génération de version pour le Service Worker
 * Génère un hash du contenu des fichiers critiques
 * À exécuter avant chaque build/déploiement
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const filesToHash = [
  'index.html',
  'state.js',
  'data.js',
  'audio.js',
  'render.js',
];

function hashFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

function generateVersion() {
  const hashes = filesToHash
    .map(f => {
      try {
        return hashFile(path.join(__dirname, f));
      } catch (e) {
        console.warn(`⚠️  Fichier manquant: ${f}`);
        return 'missing';
      }
    })
    .join('');

  const versionHash = crypto.createHash('md5').update(hashes).digest('hex').slice(0, 8);
  return versionHash;
}

function updateServiceWorker() {
  const version = generateVersion();
  const swPath = path.join(__dirname, 'sw.js');
  let swContent = fs.readFileSync(swPath, 'utf-8');

  // Remplacer la version dans sw.js
  swContent = swContent.replace(
    /const CACHE = 'dico-pattern-v[^']*'/,
    `const CACHE = 'dico-pattern-${version}'`
  );

  fs.writeFileSync(swPath, swContent, 'utf-8');
  console.log(`✅ Service Worker mis à jour : dico-pattern-${version}`);
}

updateServiceWorker();
