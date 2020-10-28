import { Aspects, Construct, Tag } from '@aws-cdk/core';
import { Cluster, HelmChart, HelmChartProps, KubernetesManifest, ServiceAccount } from '@aws-cdk/aws-eks';
import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');

import { IrsaProps, K8sHelmChartIRSA, K8sManifest, ServiceAccountIRSA } from './K8sResource';
import { createPolicy } from '../policies/PolicyUtils';
import { loadManifestYaml } from '../utils/manifest_reader';

/*
** This Construct will create an AWS for FluentBit deployment as a daemonset in your EKS cluster, using IRSA.
*/
//Policy source: https://github.com/aws-samples/amazon-ecs-fluent-bit-daemon-service/blob/master/eks/eks-fluent-bit-daemonset-policy.json
//needs this to work properly : https://github.com/aws/eks-charts/pull/283
export class AwsLoadBalancerController extends cdk.Stack {
    public sa: ServiceAccount;
    constructor(scope: Construct, id: string, cluster: Cluster) {
        super(scope, id, cluster);

        //If not already done, Tags Subnets
        cluster.vpc.publicSubnets.forEach((subnet) => {
            Aspects.of(subnet).add(new Tag('kubernetes.io/role/elb', '1', { includeResourceTypes: ['AWS::EC2::Subnet'] }))
        });
        cluster.vpc.privateSubnets.forEach((subnet) => {
            Aspects.of(subnet).add(new Tag('kubernetes.io/role/internal-elb', '1', { includeResourceTypes: ['AWS::EC2::Subnet'] }))
        });


        const albBaseResourceBaseUrl = 'https://raw.githubusercontent.com/kubernetes-sigs/aws-alb-ingress-controller/main/docs/install/';
        const albIngressControllerPolicyUrl = `${albBaseResourceBaseUrl}iam_policy.json`;

        const irsa: IrsaProps = {
            name: 'aws-load-balancer-controller',
            namespace: 'kube-system',
            iamPolicyUrl: albIngressControllerPolicyUrl
        }
        this.sa = (new ServiceAccountIRSA(this, 'alb-sa', cluster, irsa)).sa;

        //find a way to do this with cdk
        // kubectl apply -k github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master
        const yaml = require('js-yaml');
        const request = require('sync-request');
        const albCrds = yaml.safeLoadAll(request('GET', 'https://raw.githubusercontent.com/aws/eks-charts/master/stable/aws-load-balancer-controller/crds/crds.yaml').getBody())
        cluster.addManifest('albCrd-' + id, albCrds[0]);


        const props: HelmChartProps = {
            cluster: cluster,
            chart: "aws-load-balancer-controller",
            release: id,
            //version: "0.1.3", 
            repository: "https://aws.github.io/eks-charts",
            //repository: "382076407153.dkr.ecr.eu-west-1.amazonaws.com/ecrekschart",
            namespace: "kube-system",
            values: {
                clusterName: cluster.clusterName,
                serviceAccount: {
                    create: false,
                    name: "aws-load-balancer-controller",
                },
            }
        }

        //TODO: template the IAM roles with env var (equivalent of envsubst)
        const helm = new HelmChart(scope, id + 'HelmChartIRSA', props);
        helm.node.addDependency(this.sa);

    }


}



