#!/bin/bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use node

echo $NVM_DIR

cd /work/attention

PROJECT_SRC=/work/attention
DEST=/$HOME/deploy

rm -rf $DEST
mkdir -p $DEST
cp -rf $PROJECT_SRC $DEST

cd $DEST/nodejs

source ~/.bashrc

npm install

pm2 restart all