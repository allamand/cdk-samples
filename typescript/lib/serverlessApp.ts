import * as cdk from '@aws-cdk/core';
import { CfnResource } from '@aws-cdk/core';

export class SARStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const KUBECTL_APP_ARN = 'arn:aws:serverlessrepo:us-east-1:903779448426:applications/lambda-layer-kubectl';
    const KUBECTL_APP_VERSION = '2.0.0-beta2';


    new CfnResource(this, 'Resource', {
      type: 'AWS::Serverless::Application',
      properties: {
        Location: {
          ApplicationId: KUBECTL_APP_ARN,
          SemanticVersion: KUBECTL_APP_VERSION
        },
        Parameters: {
          LayerName: 'my-kubectl-layer'
        }
      }
    });

    // required for serverless app
    this.templateOptions.transforms = ['AWS::Serverless-2016-10-31'];

  }
}