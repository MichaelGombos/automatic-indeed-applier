@echo off
echo attempting to install node.js
winget install -e --id OpenJS.NodeJS --accept-package-agreements --accept-source-agreements
echo node.js installed
node -v
echo attempting to install nvm (node version manager)
winget install -e --id CoreyButler.NVMforWindows --accept-package-agreements --accept-source-agreements
echo node version manager installed
echo installing node version 18.17.1
nvm install 18.17.1
echo setting node to version 18.17.1
nvm use 18.17.1
pause