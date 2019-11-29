
[![npm version](https://badge.fury.io/js/%40pahud%2Faws-codebuild-patterns.svg)](https://badge.fury.io/js/%40pahud%2Faws-codebuild-patterns)

# @pahud/aws-codebuild-patterns

This package helps you build a automated `AWS CodeBuild` project with `AWS CDK` that builds any public git repository.


### ScheduledBuild
Customize the autobuild by specifying the custom `buildspec` or using the provided one.


### ScheduledDockerBuild
Autobuild the docker image based on the provided `Dockerfile` in the original repository and push to your private Amazon ECR repo.


In the example below, we build the Amazon Linux docker image from the `Dockerfile` at https://github.com/pahud/amazonlinux-docker-autobuild in the daily basis.

```js
import cdk = require('@aws-cdk/core');
import { ScheduledBuild, ScheduledDockderBuild } from '@pahud/aws-codebuild-patterns'
import codebuild = require('@aws-cdk/aws-codebuild');
import events = require('@aws-cdk/aws-events');

const app = new cdk.App();

/**
 * pahud/amazonlinux-docker-autobuild
 */
new ScheduledDockerBuild(this, 'BuildAmazonlinuxDocker', {
  projectName: 'amazonlinux-docker-autobuild',
  source: codebuild.Source.gitHub({
    owner: 'pahud',
    repo: 'amazonlinux-docker-autobuild'
  }),
  schedule: events.Schedule.rate(cdk.Duration.days(1)),
  repositoryName: 'amazonlinux-docker-autobuild',
  timeout: cdk.Duration.hours(4),
  ecrRepoRemovalPolicy: cdk.RemovalPolicy.DESTROY
})

```
check more samples [here](https://github.com/pahud/cdk-samples/blob/master/typescript/packages/aws-codebuild-patterns/samples/all.ts).
