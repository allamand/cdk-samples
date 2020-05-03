# cdk-samples in TypeScript

A curated list of AWS CDK samples in **TypeScript**. 

Make sure you run `npm install` to instrall required packages defined in `packages.json` and `npm run build` to compile typescript to javascript.

For example:

```bash
$ cd cdk-samples/typescript
# install the latest aws-cdk in typescript
$ npm i -g aws-cdk
# install all required packages
$ npm i
# run 'cdk bootstrap' to generate the staging s3 bucket(only for the 1st time)
$ cdk bootstrap

```

# Available Sample Libraries

check the list defined in the [factory](https://github.com/pahud/cdk-samples/blob/2c253c2e9293c72de47e4150d3a7d333648567cd/typescript/bin/cdk-samples.ts#L28)

# Deploy Stack(s)

As all stack classes are imported into a single [cdk-samples.ts](bin/cdk-samples.ts) yet will not initiate the object unless you enable it. That being said, you need enable the stack before you can deploy it, e.g.

```bash
# enable and deploy the EksStack 
cdk diff EksStack -c enable_stack=EksStack   
cdk deploy EksStack -c enable_stack=EksStack
# in some cases, you might need enable multiple stacks
cdk diff 'Eks*' -c enable_stack=EksStack,EksFargate
```

# Deploy in the default VPC or any existing VPC

You may deploy the stack in your existing VPC to save the deployment time
```bash

# enable and deploy the EksStack in my default vpc
cdk deploy EksStack -c enable_stack=EksStack -c use_default_vpc=1
# enable and deploy the EksStack in vpc-123456
cdk deploy EksStack -c enable_stack=EksStack -c use_vpc_id=vpc-123456
```


# Available NPM Packages

The following samples were published in npmjs as a standalone package you may import as a CDK construct library. Most of them are still in a very early stage and not recommended for production.

- [x] **[@pahud/aws-serverless-patterns](packages/aws-serverless-patterns/)**  [![npm version](https://badge.fury.io/js/%40pahud%2Faws-serverless-patterns.svg)](https://badge.fury.io/js/%40pahud%2Faws-serverless-patterns)
- [x] **[@pahud/aws-codebuild-patterns](packages/aws-codebuild-patterns/)**  [![npm version](https://badge.fury.io/js/%40pahud%2Faws-codebuild-patterns.svg)](https://badge.fury.io/js/%40pahud%2Faws-codebuild-patterns)
- [x] **[@pahud/aws-fargate-cicd](packages/aws-fargate-cicd/)**  [![npm version](https://badge.fury.io/js/%40pahud%2Faws-fargate-cicd.svg)](https://badge.fury.io/js/%40pahud%2Faws-fargate-cicd)



