import fg = require('../lib/fargate-cicd');
import cdk = require('@aws-cdk/core');
import codebuild = require('@aws-cdk/aws-codebuild');

const app = new cdk.App()

const env = {
  region: app.node.tryGetContext('region') || process.env.CDK_INTEG_REGION || process.env.CDK_DEFAULT_REGION,
  account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT
};

new fg.FargateCICD(app, 'FargateSampleStack', {
  env,
  defaultVpc: true,
  ecrRepoRemovalPolicy: cdk.RemovalPolicy.DESTROY,
  source: codebuild.Source.gitHub({
    owner: 'pahud',
    repo: 'flask-docker-sample',
    webhook: true,
    webhookFilters: [
      codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs('master'),
    ],
  })
})


