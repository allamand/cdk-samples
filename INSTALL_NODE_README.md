# install nodejs with nvm installer


```bash
# install the nvm installer
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
# nvm install 
nvm install lts/erbium
nvm alias default lts/erbium
```

# install AWS CDK

```bash
# install AWS CDK
npm i -g aws-cdk
# check cdk version
cdk --version
# install other required npm modules
npm install
# build the index.ts to index.js with tsc
npm run build
# cdk bootstrapping
cdk bootstrap

```
