import { Aspects, Construct, Tag } from '@aws-cdk/core';
import { Cluster, HelmChartProps } from '@aws-cdk/aws-eks';
import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');

import { K8sHelmChartIRSA, K8sResource } from './K8sResource';
import { createPolicy } from '../policies/PolicyUtils';
import { loadManifestYaml } from '../utils/manifest_reader';

/*
** This Construct will create an AWS for FluentBit deployment as a daemonset in your EKS cluster, using IRSA.
*/
//Policy source: https://github.com/aws-samples/amazon-ecs-fluent-bit-daemon-service/blob/master/eks/eks-fluent-bit-daemonset-policy.json
export class AwsForFluentBit extends cdk.Stack {
    constructor(scope: Construct, id: string, cluster: Cluster, irsa: { [key: string]: any }) {
        super(scope, id, cluster);

        const props: HelmChartProps = {
            cluster: cluster,
            chart: "aws-for-fluent-bit",
            release: id,
            //version: "0.1.3", 
            repository: "https://aws.github.io/eks-charts",
            namespace: "kube-system",
            values: {
                serviceAccount: {
                    create: false,
                    name: id,
                },
                cloudWatch: {
                    enabled: true,
                    region: this.region,
                    logStreamName: "CassKop",
                    logGroupName: "/aws/eks/" + cluster.clusterName + "/logs",
                },
                firehose: {
                    enabled: false,
                },
                kinesis: {
                    enabled: false,
                },
            }
        }

        new K8sHelmChartIRSA(scope, id + 'HelmChartIRSA', cluster, irsa, props);

    }


}



