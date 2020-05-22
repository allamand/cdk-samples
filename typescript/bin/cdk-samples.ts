#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import { VpcProvider } from '../lib/vpc';
import { FargateAlbSvcStack } from '../lib/fargate-alb-svc';
import { FargateCICDStack } from '../lib/fargate-cicd';
import { ServerlessRestApiStack } from '../lib/serverless-rest-api';
import { FargateEventTarget } from '../lib/fargate-event-targets';
import { EcsEc2Stack } from '../lib/ecs';
import { EksStack, EksFargate, Bottlerocket, EksIrsa, EksMini, EksSpot } from '../lib/eks';
import { TranscribeStack } from '../lib/transcribe';
import { ApiGatewayCustomDomainStack } from '../lib/apig-custom-domain';
import { ApiSixStack } from '../lib/apisix';
import { EksNginxStack } from '../lib/eks-nginx-svc';
import { ClientVpn } from '../lib/vpc-client-vpn';
import { SARStack } from '../lib/serverless-app';
import { GlobalAcceleratorStack } from '../lib/global-accelerator';

const app = new cdk.App();

const env = {
    region: app.node.tryGetContext('region') || process.env.CDK_INTEG_REGION || process.env.CDK_DEFAULT_REGION,
    account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT
};

const enabledStacks = app.node.tryGetContext('enable_stack') ? app.node.tryGetContext('enable_stack').split(',') : ''

var factory = {
    'CdkVpcOnlyStack': VpcProvider,
    'FargateAlbSvcStack': FargateAlbSvcStack,
    'FargateCICDStack': FargateCICDStack,
    'ServerlessRestApiStack': ServerlessRestApiStack,
    'FargateEventTarget': FargateEventTarget,
    'EcsEc2Stack': EcsEc2Stack,
    'EksStack': EksStack,
    'EksFargate': EksFargate,
    'Bottlerocket': Bottlerocket,
    'TranscribeStack': TranscribeStack,
    'ApiGatewayCustomDomainStack': ApiGatewayCustomDomainStack,
    'ApiSixStack': ApiSixStack,
    'EksNginxStack': EksNginxStack,
    'ClientVpn': ClientVpn,
    'SARStack': SARStack,
    'GlobalAcceleratorStack': GlobalAcceleratorStack,
    'EksIrsa': EksIrsa,
    'EksMini': EksMini,
    'EksSpot': EksSpot,
}

function activateIfEnabled(stackName: string) {
    return enabledStacks.includes(stackName) ? new (<any>factory)[stackName](app, stackName, { env }) : null
}

for (let s in factory ) { activateIfEnabled(s) }
