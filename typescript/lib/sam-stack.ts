import cdk = require('@aws-cdk/core');
import sam = require('@aws-cdk/aws-sam');

const app = new cdk.App()
const stack = new cdk.Stack(app, 'SamDemo')

const samApp = new sam.CfnFunction(stack, 'Func', {
  codeUri: 's3://pahud-tmp-us-west-2/e01829d16e86f71ce4fc838d36b7a997',
  handler: 'app.lambda_handler',
  runtime: 'python3.7',
  autoPublishAlias: 'live',
  deploymentPreference:
  {
    type: 'Canary10Percent10Minutes',
    enabled: true
  },
})

samApp.events