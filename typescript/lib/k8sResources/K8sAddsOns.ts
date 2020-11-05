import { Aspects, Construct, Tag } from "@aws-cdk/core";
import { Cluster, HelmChart, HelmChartProps, KubernetesManifest, ServiceAccount } from "@aws-cdk/aws-eks";
import cdk = require("@aws-cdk/core");
import eks = require("@aws-cdk/aws-eks");
import ec2 = require("@aws-cdk/aws-ec2");
import iam = require("@aws-cdk/aws-iam");

import { IrsaProps, K8sHelmChartIRSA, K8sManifest, ServiceAccountIRSA } from "./K8sResource";
import { createPolicy } from "../policies/PolicyUtils";
import { loadManifestYaml } from "../utils/manifest_reader";
import { AwsLoadBalancerController } from "./AwsLoadBalancerController";
import { ExternalDns } from "./ExternalDns";
import { MetricsServer } from "./MetricsServer";
import { ClusterAutoscaler } from "./ClusterAutoscaler";
import { EbsCsiDriver } from "./EbsCsiDriver";
import { EksUtilsAdmin } from "./EksUtilsPod";
import { CloudWatchAgent } from "./CloudWatchAgent";
import { AwsForFluentBit } from "./AwsForFluentBit";
import { KubeOpsView } from "./KubeOpsView";
import { CassKop } from "./CassKop";
import { CassKopCassandraCluster } from "./CassKopCassandraCluster";
import { DEFAULT_HOSTED_ZONE, DEFAULT_EXTERNAL_DNS_POLICY } from "../defaults";

export class K8sAddsOns extends Construct {
  public sa: ServiceAccount;
  constructor(scope: Construct, id: string, cluster: Cluster, props: cdk.StackProps = {}) {
    super(scope, id);

    // Deploy ALB Ingress Controller
    //new AlbIngressController(this, 'alb-ingress-controller', cluster);
    const awsLoadBalancerController = new AwsLoadBalancerController(this, "aws-load-balancer-controller", cluster);
    new cdk.CfnOutput(this, "AwsLoadBalancerControllerRoleOutput", {
      value: awsLoadBalancerController.sa.role.roleName,
    });

    // Deploy External-DNS Controller
    const externalDNSPolicy =
      this.node.tryGetContext("EXTERNAL_DNS_POLICY") || process.env.external_dns_policy || DEFAULT_EXTERNAL_DNS_POLICY;
    const hostedZone = this.node.tryGetContext("hosted_zone") || process.env.hosted_zone || DEFAULT_HOSTED_ZONE;
    const externalDns = new ExternalDns(this, "extrernal-dns", cluster, {
      domain: hostedZone,
      policy: externalDNSPolicy,
      owner: cluster.clusterName,
    });
    new cdk.CfnOutput(this, "externalDNSPolicyRoleOutput", { value: externalDns.sa.role.roleName });

    //Deploy Metrics Server
    new MetricsServer(this, "metrics-server", cluster);

    //Deploy Cluster Autoscaler
    const clusterAutoScaler = new ClusterAutoscaler(this, "cluster-autoscaler", cluster, {});
    new cdk.CfnOutput(this, "clusterAutoScalerRoleOutput", { value: clusterAutoScaler.sa.role.roleName });

    //Deploy EbsCsiDriver
    const ebsCsiDriver = new EbsCsiDriver(this, "ebs-csi-driver", cluster, {});
    new cdk.CfnOutput(this, "ebsCsiDriverRoleOutput", { value: ebsCsiDriver.sa.role.roleName });

    //Deploy EksUtils admin pod in ektusils namespace

    //Launch a debug pod on my nodes
    const eksUtilsAdmin = new EksUtilsAdmin(this, "eksutils-admin", cluster, {
      namespace: "eksutils",
    });
    new cdk.CfnOutput(this, "eksUtilsAdminRoleOutput", { value: eksUtilsAdmin.sa.role.roleName });

    //Launch the same debug pod in Fargate
    const eksUtilsAdminFargate = new EksUtilsAdmin(this, "eksutils-admin-farfate", cluster, {
      namespace: "fargate",
      schedulerName: "fargate",
    });
    new cdk.CfnOutput(this, "eksUtilsAdminFargateRoleOutput", { value: eksUtilsAdminFargate.sa.role.roleName });

    //Deploy CloudWatch Agent for CloudWatch Container Insight
    const cloudWatchAgent = new CloudWatchAgent(this, "cloudWatch-agent", cluster, {});
    new cdk.CfnOutput(this, "cloudWatchAgentRoleOutput", { value: cloudWatchAgent.sa.role.roleName });

    //Configure FluentBit to forward logs to CloudWatch & ElasticSearch
    //Waiting for PR to merge meanwhile we can deploy with
    //helm upgrade --install aws-for-fluent-bit --namespace kube-system ./aws-for-fluent-bit --set cloudWatch.region=eu-west-1 --set firehose.enabled=false  --set kinesis.enabled=false --set elasticsearch.enabled=true --set elasticsearch.awsRegion=eu-west-1 --set elasticsearch.host=search-eks-casskop-bjdeotxeyjf6ggltm3xhzxufaq.eu-west-1.es.amazonaws.com --version 0.1.4 --set image.tag=2.7.0 --set serviceAccount.create=false --set serviceAccount.name=aws-for-fluent-bit

    const elasticsearchDomain = this.node.tryGetContext("elasticsearch_domain") || process.env.elasticsearch_domain;
    const awsForFluentBit = new AwsForFluentBit(this, "aws-for-fluent-bit", cluster, {
      name: "aws-for-fluent-bit",
      namespace: "kube-system",
      //iamPolicyFile: "aws-for-fluent-bit.json",
      iamPolicyInline:
        ' { \
          "Version": "2012-10-17", \
            "Statement": [ \
              { \
                "Effect": "Allow", \
                "Action": [ \
                  "firehose:PutRecordBatch" \
                ], \
                "Resource": "*" \
              }, \
              { \
                "Effect": "Allow", \
                "Action": "logs:PutLogEvents", \
                "Resource": "arn:aws:logs:*:*:log-group:*:*:*" \
              }, \
              { \
                "Effect": "Allow", \
                "Action": [ \
                  "logs:CreateLogStream", \
                  "logs:DescribeLogStreams", \
                  "logs:PutLogEvents" \
                ], \
                "Resource": "arn:aws:logs:*:*:log-group:*" \
              }, \
              { \
                "Effect": "Allow", \
                "Action": "logs:CreateLogGroup", \
                "Resource": "*" \
              }, \
              { \
                "Effect": "Allow", \
                "Action": "es:ESHttp*", \
                "Resource": "arn:aws:es:::domain/' + elasticsearchDomain + '/*" \
              } \
            ] \
          }',
    });
    new cdk.CfnOutput(this, "AwsForFluentBitOutput", { value: awsForFluentBit.sa.role.roleArn });

    new KubeOpsView(this, "kube-ops-view", cluster, {});

    const casskop = new CassKop(this, "casskop", cluster, {});
    const cassandracluster = new CassKopCassandraCluster(this, "casskop-cluster", cluster, {});
    cassandracluster.node.addDependency(casskop);
    //Deploy a Cassandra monitoring tool in Fargate
    const cassandraNotetool = new EksUtilsAdmin(this, "cass-nodetool", cluster, {
      namespace: "cassandra",
      createNamespace: false, // DO not create thenamespace (ANF do ne delete thenamespace in case of deletion)
      schedulerName: "fargate",
      image: "cassandra",
      command: "/bin/sh",
      //      args: ["-c", "while true; do sleep 60; done"]
      args: [
        "-c",
        'while true; do echo -n "[$(date)] Number of Cassandra Pods Down in the cluster (Allowed by PDB: 1): " | tee -a /var/log/containers/nodetool.log ; nodetool -h cassandra-demo.cassandra status | grep DN | wc -l | tee -a /var/log/containers/nodetool.log ; sleep 5 ; done',
      ],
    });
    new cdk.CfnOutput(this, "cassandraNotetoolRoleOutput", { value: cassandraNotetool.sa.role.roleName });
    cassandraNotetool.node.addDependency(casskop);

    const argoRole = new ServiceAccountIRSA(this, "argo", cluster, {
      iamPolicyFile: "",
      iamPolicyInline:
        ' \
            { \
            "Version": "2012-10-17",\
            "Statement": [\
              {\
                "Effect": "Allow",\
                "Action": [\
                  "s3:*"\
                ],\
                "Resource": [\
                  "arn:aws:s3:::batch-artifact-repository-' +
        props.env!.account +
        '",\
                  "arn:aws:s3:::batch-artifact-repository-' +
        props.env!.account +
        '/*"\
                ]\
              }\
            ]\
          }',
      name: "argo",
      namespace: "argo",
    });
    new cdk.CfnOutput(this, "argoRoleOutput", { value: argoRole.sa.role.roleArn });

    //Not uses on production account :)
    const k8s101Role = new ServiceAccountIRSA(this, "k8s-101-role", cluster, {
      iamPolicyFile: "",
      iamPolicyInline:
        ' \
          { \
            "Version": "2012-10-17", \
            "Statement": [ \
              { \
                "Effect": "Allow", \
                "Action": "*", \
                "Resource": "*" \
              } \
            ] \
          }',
      name: "k8s-101-role",
      namespace: "default",
    });
    new cdk.CfnOutput(this, "k8s101RoleOutput", { value: k8s101Role.sa.role.roleArn });
  }
}
