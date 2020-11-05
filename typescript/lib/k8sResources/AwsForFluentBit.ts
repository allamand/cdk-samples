import { Aspects, Construct, Tag } from "@aws-cdk/core";
import { Cluster, HelmChartProps } from "@aws-cdk/aws-eks";
import cdk = require("@aws-cdk/core");
import eks = require("@aws-cdk/aws-eks");
import ec2 = require("@aws-cdk/aws-ec2");
import iam = require("@aws-cdk/aws-iam");

import { IrsaProps, K8sHelmChartIRSA, K8sManifest } from "./K8sResource";
import { createPolicy } from "../policies/PolicyUtils";
import { loadManifestYaml } from "../utils/manifest_reader";

/*
 ** This Construct will create an AWS for FluentBit deployment as a daemonset in your EKS cluster, using IRSA.
 */
//Policy source: https://github.com/aws-samples/amazon-ecs-fluent-bit-daemon-service/blob/master/eks/eks-fluent-bit-daemonset-policy.json
//needs this to work properly : https://github.com/aws/eks-charts/pull/283
//Configure FluentBit to forward logs to CloudWatch & ElasticSearch
//Waiting for PR to merge meanwhile we can deploy with
//helm upgrade --install aws-for-fluent-bit --namespace kube-system ./aws-for-fluent-bit --set cloudWatch.region=eu-west-1 --set firehose.enabled=false  --set kinesis.enabled=false --set elasticsearch.enabled=true --set elasticsearch.awsRegion=eu-west-1 --set elasticsearch.host=search-eks-casskop-bjdeotxeyjf6ggltm3xhzxufaq.eu-west-1.es.amazonaws.com --version 0.1.4 --set image.tag=2.7.0 --set serviceAccount.create=false --set serviceAccount.name=aws-for-fluent-bit
// ADD param to elasticsearch Replace_Dots Replace_Dots
export class AwsForFluentBit extends cdk.Stack {
  public sa: eks.ServiceAccount;
  constructor(scope: Construct, id: string, cluster: Cluster, irsa: IrsaProps = {}) {
    super(scope, id, cluster);

    const elasticsearchHost = this.node.tryGetContext("elasticsearch_host") || process.env.elasticsearch_host;

    const props: HelmChartProps = {
      cluster: cluster,
      chart: "aws-for-fluent-bit",
      release: id,
      //version: "0.1.3",
      repository: "https://aws.github.io/eks-charts",
      //repository: "382076407153.dkr.ecr.eu-west-1.amazonaws.com/ecrekschart",
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
        elasticsearch: {
          enabled: true,
          awsRegion: this.region,
          host: elasticsearchHost,
        },
        firehose: {
          enabled: false,
        },
        kinesis: {
          enabled: false,
        },
      },
    };

    //TODO: template the IAM roles with env var (equivalent of envsubst)
    const helmChart = new K8sHelmChartIRSA(scope, id + "HelmChartIRSA", cluster, irsa, props);
    this.sa = helmChart.sa;
  }
}
