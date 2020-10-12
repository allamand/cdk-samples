import { Aspects, Construct, Tag } from '@aws-cdk/core';
import { Cluster, HelmChart, HelmChartProps } from '@aws-cdk/aws-eks';
import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');

import { DEFAULT_DOMAIN_ZONE } from '../defaults';
import { K8sHelmChartIRSA } from './K8sResource';

/*
** This Construct will create an AWS for FluentBit deployment as a daemonset in your EKS cluster, using IRSA.
*/
export class KubeOpsView extends Construct {
    protected readonly cluster: Cluster;

    constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any }) {
        super(scope, id);

        const appDomain = this.node.tryGetContext('app_domain') || process.env.app_domain || DEFAULT_DOMAIN_ZONE
        const certificateArn = this.node.tryGetContext('certificate_arn') || process.env.certificate_arn

        this.cluster = cluster;

        const chartProps: HelmChartProps = {
            cluster: cluster,
            chart: "kube-ops-view",
            release: id,
            //version: "0.1.3", 
            repository: "https://kubernetes-charts.storage.googleapis.com",
            namespace: "metrics",
            values: {
                service: {
                    type: "ClusterIP",
                },
                redis: {
                    enabled: false,
                },
                rbac: {
                    create: true,
                },
                ingress: {
                    enabled: true,
                    path: "/*",
                    hostname: "kube-ops-view.eu-west-1." + appDomain,
                    annotations: {
                        "kubernetes.io/ingress.class": "alb",
                        "alb.ingress.kubernetes.io/scheme": "internet-facing",
                        "alb.ingress.kubernetes.io/target-type": "ip",
                        "alb.ingress.kubernetes.io/actions.ssl-redirect": "{\"Type\": \"redirect\", \"RedirectConfig\": { \"Protocol\": \"HTTPS\", \"Port\": \"443\", \"StatusCode\": \"HTTP_301\"}}",
                        "alb.ingress.kubernetes.io/listen-ports": "[{\"HTTP\": 80}\, {\"HTTPS\":443}]",
                        "alb.ingress.kubernetes.io/certificate-arn": certificateArn,
                        "force": "update",
                    },
                },

            },
            wait: true,
            createNamespace: true
        }

        new HelmChart(this, id + 'HelmChart', chartProps);

        //new K8sHelmChartIRSA(scope, id + 'HelmChartIRSA', cluster, {}, chartProps);


    }


}
