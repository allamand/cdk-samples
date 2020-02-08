import cdk = require('@aws-cdk/core');
// import { Function, Code, Runtime, Tracing, InlineCode } from '@aws-cdk/aws-lambda';
import lambda = require('@aws-cdk/aws-lambda');
import path = require('path');
import apigateway = require('@aws-cdk/aws-apigateway');
import * as logs from '@aws-cdk/aws-logs';
import { Vpc, SubnetType } from '@aws-cdk/aws-ec2';

export class ServerlessRestApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, 'VPC', {
      isDefault: true
    })

    /**
     * Running Lambda in Python and enable the VPC support
     */
    const handler = new lambda.Function(this, 'FuncPython', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../function/hello-world')),
      handler: 'lambda_function.handler',
      runtime: lambda.Runtime.PYTHON_3_7,
      tracing: lambda.Tracing.ACTIVE,
      memorySize: 512,
      vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE
      }
    })

    const api = new apigateway.LambdaRestApi(this, 'PythonRestApi', {
      handler
    })

    /**
     * Running Lambda in Node with InlineCode
     */
    const fn = new lambda.Function(this, 'FuncNode', {
      code: new lambda.InlineCode(`exports.handler = (event, context, callback) =>
      callback(null, {
        statusCode: '200',
        body: JSON.stringify(event),
        headers: {
          'Content-Type': 'application/json',
        },
      });`),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    new cdk.CfnOutput(this, 'LambdaCloudwatchLogGroupURL', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#logStream:group=${fn.logGroup.logGroupName}`
    })

    new apigateway.LambdaRestApi(this, 'NodeRestAPI', {
      handler: fn,
      // please note in China region there's only API Gateway regional endpoint
      endpointTypes: [apigateway.EndpointType.REGIONAL]
    });
  }
}

