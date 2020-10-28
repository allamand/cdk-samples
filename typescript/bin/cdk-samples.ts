#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/core');
import {
    ApiGatewayCustomDomainStack, ApiSixStack, AutoscalingGroupStack, BastionHost, EcsEc2Stack,
    VpcProvider, ClientVpn, SARStack, ServerlessRestApiStack, TranscribeStack, VpcStack, StatefulCluster, StatefulSpotCluster
} from '../lib';
// Amaozn EKS
import { AlbIngressControllerStack, EksStack, EksFargate, Bottlerocket, EksIrsa, EksNginxStack, EksMini, EksSpot } from '../lib';
// AWS Fargate
import { FargateCICDStack, FargateAlbSvcStack, FargateEventTarget } from '../lib';

const app = new cdk.App();

const env = {
    region: app.node.tryGetContext('region') || process.env.CDK_INTEG_REGION || process.env.CDK_DEFAULT_REGION,
    account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT
};

const enabledStacks = app.node.tryGetContext('enable_stack') ? app.node.tryGetContext('enable_stack').split(',') : ''

var factory = {
    //'AccessPointProvider': AccessPointProvider,
    'AlbIngressControllerStack': AlbIngressControllerStack,
    'AutoscalingGroupStack': AutoscalingGroupStack,
    'BastionHost': BastionHost,
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
    'EksIrsa': EksIrsa,
    'EksMini': EksMini,
    'EksSpot': EksSpot,
    //'LambdaEfsStack': LambdaEfsStack,
    'cdkVpc': VpcStack,
    'StatefulCluster': StatefulCluster,
    'StatefulCluster2': StatefulCluster,
    'StatefulSpotCluster': StatefulSpotCluster,
}

function activateIfEnabled(stackName: string) {
    return enabledStacks.includes(stackName) ? new (<any>factory)[stackName](app, stackName, { env }) : null
}

for (let s in factory) { activateIfEnabled(s) }
