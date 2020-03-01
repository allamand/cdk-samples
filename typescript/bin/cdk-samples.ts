#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { FargateAlbSvcStack } from '../lib/fargate-alb-svc';
import { FargateCICDStack } from '../lib/fargate-cicd';
import { ServerlessRestApiStack } from '../lib/serverless-rest-api';
// import { AwsFireLensStack } from '../lib/awsfirelens';
import { FargateEventTarget } from '../lib/fargate-event-targets';
import { EksIrsaStack } from '../lib/eks-irsa';
import { EcsEc2Stack } from '../lib/ecs';
import { EksStack } from '../lib/eks';
import { TranscribeStack } from '../lib/transcribe';
import { ApiGatewayCustomDomainStack } from '../lib/apig-custom-domain';
import { ApiSixStack } from '../lib/apisix';
import { EksNginxStack } from '../lib/eks-nginx-svc';
import { ClientVpn } from '../lib/vpc-client-vpn';


const app = new cdk.App();

const env = {
    region: app.node.tryGetContext('region') || process.env.CDK_INTEG_REGION || process.env.CDK_DEFAULT_REGION,
    account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT
};


/**
 * A simple PHP service running with AWS Fargate and ALB
 * https://github.com/pahud/cdk-samples/tree/master/typescript/fargate-alb-svc
 * Sample: cdk deploy -c region=ap-northeast-1 FargateAlbService
 */
const fargateAlbSvc = new FargateAlbSvcStack(app, 'FargateAlbService', { env })

/**
 * Amazon ECS services on EC2
 * Sample: cdk deploy -c region=ap-northeast-1 EcsEc2Service
 */
const ecsEc2Service = new EcsEc2Stack(app, 'EcsEc2Service', { env })



/**
 * Building Fargate CI/CD pipelines from scratch with AWS CDK
 * https://github.com/pahud/cdk-samples/tree/master/typescript/fargate-cicd
 * Sample: cdk deploy -c region=ap-northeast-1 FargateCICD
 */
const fargatecicd = new FargateCICDStack(app, 'FargateCICD', { env })

/**
 * Fargate as CloudWatch Events target 
 * https://github.com/pahud/cdk-samples/tree/master/typescript/fargate-event-target
 * Sample: cdk deploy -c region=ap-northeast-1 -c topicArn=arn:aws:sns:ap-northeast-1:112233445566:SNS2IM fargateEventTarget
 */
const fargateEventTarget = new FargateEventTarget(app, 'fargateEventTarget', {
    env: env,
    topicArn: app.node.tryGetContext('topicArn') || 'arn:aws:sns:ap-northeast-1:112233445566:undefined'
})

/**
 * Serverless REST API with AWS Lambda in VPC and Amazon API Gateway
 * https://github.com/pahud/cdk-samples/tree/master/typescript/serverless-rest-api
 * Sample: cdk deploy -c region=ap-northeast-1 ServerlessRestAPI
 */
const serverlessRestApi = new ServerlessRestApiStack(app, app.node.tryGetContext('ServerlessRestApiStackName') ?? 'ServerlessRestAPI', { env })


/**
 * 
 */
const eksIrsaDemo = new EksIrsaStack(app, 'EksIrsaStack', { env })

/**
 * 
 */
const t = new TranscribeStack(app, 'TranscribeStack', { env })


/**
 *  Amazon EkS with Fargate profile
 */
const eks = new EksStack(app, app.node.tryGetContext('stack_name') ?? 'EksStack', { env })


/**
 *  Amazon EkS with Nginx service
 */
const eksNginxSvc = new EksNginxStack(app, 'EksNginxService', { env })

/**
 * WIP
 */
// const awsFireLensDemo = new AwsFireLensStack(app, 'awsFireLensDemo', {
//     env: env,
//     containerName: 'nginx',
//     image: 'nginx',
//     port: 80
// })

/**
 * WIP
 */
const apiSix = new ApiSixStack(app, 'apiSix', { env })


const apiGatewayCustomDomain = new ApiGatewayCustomDomainStack(app, 'apiGatewayCustomDomain', { env })

/**
 * AWS Client VPC Endpoint
 */

const cvpn = new ClientVpn(app, 'ClientVpn', { env })