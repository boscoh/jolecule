# Build dist version for embedding
npm run dist-build
git add dist
# Build Vue client for Electron/Webapp
npm run client-build
git add app/vue/dist
