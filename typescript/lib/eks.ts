import cdk = require("@aws-cdk/core");
import eks = require("@aws-cdk/aws-eks");
import ec2 = require("@aws-cdk/aws-ec2");
import iam = require("@aws-cdk/aws-iam");
import { Stack } from "@aws-cdk/core";
import { VpcProvider } from "./vpc";
import { ExternalDns } from "./k8sResources/ExternalDns";
import { AlbIngressController } from "./k8sResources/AlbIngressController";
import { MetricsServer } from "./k8sResources/MetricsServer";
import {
  DEFAULT_CLUSTER_NAME,
  DEFAULT_CLUSTER_VERSION,
  DEFAULT_DOMAIN_ZONE,
  DEFAULT_EXTERNAL_DNS_POLICY,
  DEFAULT_KEY_NAME,
  DEFAULT_SSH_SOURCE_IP_RANGE,
} from "./defaults";
import { ClusterAutoscaler } from "./k8sResources/ClusterAutoscaler";
import { EbsCsiDriver } from "./k8sResources/EbsCsiDriver";
import { EksUtilsAdmin } from "./k8sResources/EksUtilsPod";
import { DefaultCapacityType } from "@aws-cdk/aws-eks";
import { SubnetType } from "@aws-cdk/aws-ec2";
import { K8sHelmChartIRSA, ServiceAccountIRSA } from "./k8sResources/K8sResource";
import { AwsForFluentBit } from "./k8sResources/AwsForFluentBit";
import { CloudWatchAgent } from "./k8sResources/CloudWatchAgent";
import { Monitoring, UpdateType } from "@aws-cdk/aws-autoscaling";
import { KubeOpsView } from "./k8sResources/KubeOpsView";
import { CassKop } from "./k8sResources/CassKop";
import { CassKopCassandraCluster } from "./k8sResources/CassKopCassandraCluster";
import { AwsLoadBalancerController } from "./k8sResources/AwsLoadBalancerController";
import { K8sAddsOns } from "./k8sResources/K8sAddsOns";

export class EksStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion =
      this.node.tryGetContext("cluster_version") || process.env.cluster_version || DEFAULT_CLUSTER_VERSION;
    const vpc = VpcProvider.getOrCreate(this);
    const mastersRole = new iam.Role(this, "AdminRole", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    new eks.Cluster(this, "EKSCluster", {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
    });

    new cdk.CfnOutput(this, "Region", { value: Stack.of(this).region });
    new cdk.CfnOutput(this, "ClusterVersion", { value: clusterVersion });
  }
}

// cluster with 2 x m5.large spot instances
export class EksSpot extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion =
      this.node.tryGetContext("cluster_version") || process.env.cluster_version || DEFAULT_CLUSTER_VERSION;

    // use an existing vpc or create a new one
    const vpc = VpcProvider.getOrCreate(this);

    const mastersRole = new iam.Role(this, "AdminRole", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const cluster = new eks.Cluster(this, "EKSCluster", {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
      defaultCapacity: 0,
    });

    cluster.addAutoScalingGroupCapacity("Spot", {
      instanceType: new ec2.InstanceType("m5.large"),
      maxInstanceLifetime: cdk.Duration.days(7),
      spotPrice: "0.1",
    });

    new cdk.CfnOutput(this, "Region", { value: Stack.of(this).region });
    new cdk.CfnOutput(this, "ClusterVersion", { value: clusterVersion });
  }
}

export class EksIrsa extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion =
      this.node.tryGetContext("cluster_version") || process.env.cluster_version || DEFAULT_CLUSTER_VERSION;

    // use an existing vpc or create a new one
    const vpc = VpcProvider.getOrCreate(this);

    const mastersRole = new iam.Role(this, "AdminRole", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const cluster = new eks.Cluster(this, "EKSCluster", {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
    });

    const sa = cluster.addServiceAccount("MyServiceAccount", {});

    const pod = cluster.addManifest("mypod2", {
      apiVersion: "v1",
      kind: "Pod",
      metadata: { name: "mypod2" },
      spec: {
        serviceAccountName: sa.serviceAccountName,
        containers: [
          {
            name: "main",
            image: "pahud/aws-whoami",
            ports: [{ containerPort: 5000 }],
          },
        ],
      },
    });

    pod.node.addDependency(sa);

    new cdk.CfnOutput(this, "Region", { value: Stack.of(this).region });
    new cdk.CfnOutput(this, "ClusterVersion", { value: clusterVersion });
    // new cdk.CfnOutput(this, 'SARoleArn', { value: sa.role.roleArn })
  }
}

export class EksFargate extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion =
      this.node.tryGetContext("cluster_version") || process.env.cluster_version || DEFAULT_CLUSTER_VERSION;

    // use an existing vpc or create a new one
    const vpc = VpcProvider.getOrCreate(this);

    const mastersRole = new iam.Role(this, "AdminRole", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const cluster = new eks.Cluster(this, "Cluster", {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
    });

    cluster.addFargateProfile("FargateProfile", {
      selectors: [{ namespace: "default" }, { namespace: "kube-system" }],
    });

    new cdk.CfnOutput(this, "Region", { value: Stack.of(this).region });
    new cdk.CfnOutput(this, "ClusterVersion", { value: clusterVersion });
  }
}

export class Bottlerocket extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion =
      this.node.tryGetContext("cluster_version") || process.env.cluster_version || DEFAULT_CLUSTER_VERSION;

    // use an existing vpc or create a new one
    const vpc = VpcProvider.getOrCreate(this);

    const mastersRole = new iam.Role(this, "AdminRole", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const cluster = new eks.Cluster(this, "EKSCluster", {
      vpc,
      mastersRole,
      defaultCapacity: 0,
      version: eks.KubernetesVersion.of(clusterVersion),
    });

    // add bottlerocket nodes
    const bottlerocketAsg = cluster.addAutoScalingGroupCapacity("BottlerocketNodes", {
      instanceType: new ec2.InstanceType("t3.small"),
      minCapacity: 2,
      machineImageType: eks.MachineImageType.BOTTLEROCKET,
      spotPrice: "0.0272",
      keyName: "aws-pahud",
    });

    // enable SSM agent for the bottlerocket IAM instance role
    bottlerocketAsg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));

    new cdk.CfnOutput(this, "Region", { value: Stack.of(this).region });
    new cdk.CfnOutput(this, "ClusterVersion", { value: clusterVersion });
  }
}

// Stack with one spot instance only. Ideal for testing only.
export class EksMini extends cdk.Stack {
  readonly cluster: eks.Cluster;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion =
      this.node.tryGetContext("cluster_version") || process.env.cluster_version || DEFAULT_CLUSTER_VERSION;

    const vpc = VpcProvider.getOrCreate(this);

    const mastersRole = new iam.Role(this, "AdminRole", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    this.cluster = new eks.Cluster(this, "EKSMiniCluster", {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
      defaultCapacity: 0,
    });

    this.cluster.addAutoScalingGroupCapacity("Spot", {
      instanceType: new ec2.InstanceType("t3.medium"),
      maxInstanceLifetime: cdk.Duration.days(7),
      machineImageType: eks.MachineImageType.BOTTLEROCKET,
      minCapacity: 1,
      spotPrice: "0.05",
    });

    new cdk.CfnOutput(this, "Region", { value: Stack.of(this).region });
    new cdk.CfnOutput(this, "ClusterVersion", { value: clusterVersion });
  }
}

export class AlbIngressControllerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    const stack = cdk.Stack.of(this);

    const mastersRole = new iam.Role(this, "AdminRole", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const clusterVersion =
      this.node.tryGetContext("cluster_version") || process.env.cluster_version || DEFAULT_CLUSTER_VERSION;
    const clusterName = this.node.tryGetContext("cluster_name") || process.env.cluster_name || DEFAULT_CLUSTER_NAME;
    const keyName = this.node.tryGetContext("key_name") || process.env.key_name || DEFAULT_KEY_NAME;
    const instanceType = this.node.tryGetContext("instance_type") || process.env.instance_type || "c5d.4xlarge";
    const desiredSize = this.node.tryGetContext("desired_size") || Number(process.env.desired_size) || 4;
    const sshAccessIpCIDR =
      this.node.tryGetContext("ssh_access_cidr") || process.env.ssh_access_cidr || DEFAULT_SSH_SOURCE_IP_RANGE;

    const vpc = VpcProvider.getOrCreate(this);

    const cluster = new eks.Cluster(this, "AlbIngressControllerStack", {
      vpc: vpc,
      mastersRole: mastersRole,
      clusterName: clusterName,
      version: eks.KubernetesVersion.of(clusterVersion),

      defaultCapacity: 3,
      defaultCapacityInstance: new ec2.InstanceType("t3.medium"),
      defaultCapacityType: DefaultCapacityType.NODEGROUP,
    });

    //We can also add other nodesgroups manually

    cluster.addNodegroupCapacity("nodegroup", {
      nodegroupName: clusterName + "-addNodegroupCapacity1",
      instanceType: new ec2.InstanceType("m5.large"),
      minSize: 1,
      maxSize: 50,
      labels: {
        "cdk-nodegroup": "addNodegroupCapacity1",
      },
      tags: {
        "cdk-nodegroup": "addNodegroupCapacity1",
      },
      remoteAccess: {
        sshKeyName: keyName,
      },
    });

    //Add SPot Instances

    const spotAsg = cluster.addAutoScalingGroupCapacity("Spot", {
      instanceType: new ec2.InstanceType("t3.medium"),
      maxInstanceLifetime: cdk.Duration.days(7),
      minCapacity: 1,
      maxCapacity: 20,
      spotPrice: "0.05",
      keyName: keyName,
    });
    spotAsg.connections.allowFrom(
      ec2.SecurityGroup.fromSecurityGroupId(this, "clusterSG", cluster.clusterSecurityGroupId),
      ec2.Port.allTraffic(),
      "allow all traffic from cluster security group"
    );

    //Add BottleRocket Instances
    /*
    const bottleRocket = cluster.addAutoScalingGroupCapacity('BottlerocketNodes', {
      instanceType: new ec2.InstanceType('t3.small'),
      minCapacity:  2,
      machineImageType: eks.MachineImageType.BOTTLEROCKET
    });
    bottleRocket.connections.allowFrom(ec2.SecurityGroup.fromSecurityGroupId(this, "clusterSG", cluster.clusterSecurityGroupId) , ec2.Port.udp(53), "allow udp 53 from cluster security group");
    */

    //Add Fargate profile
    cluster.addFargateProfile("FargateProfile", {
      selectors: [{ namespace: "fargate" }, { namespace: "fargate2" }],
    });

    // Deploy ALB Ingress Controller
    new AlbIngressController(this, "alb-ingress-controller", cluster);

    // Deploy External-DNS Controller
    const externalDNSPolicy =
      this.node.tryGetContext("EXTERNAL_DNS_POLICY") || process.env.external_dns_policy || DEFAULT_EXTERNAL_DNS_POLICY;
    const appDomain = this.node.tryGetContext("app_domain") || process.env.app_domain || DEFAULT_DOMAIN_ZONE;
    new ExternalDns(this, "extrernal-dns", cluster, {
      domain: appDomain,
      policy: externalDNSPolicy,
      owner: clusterName,
    });

    //Deploy Metrics Server
    new MetricsServer(this, "metrics-server", cluster);

    //Deploy Cluster Autoscaler
    new ClusterAutoscaler(this, "cluster-autoscaler", cluster, {});

    //Deploy EbsCsiDriver
    new EbsCsiDriver(this, "ebs-csi-driver", cluster, {});

    //Deploy EksUtils admin pod in ektusils namespace
    new EksUtilsAdmin(this, "eksutils-admin", cluster, {
      namespace: "eksutils",
    });

    //Deploy EksUtils admin pod in default namespace (backed by fargate)
    new EksUtilsAdmin(this, "eksutils-admin-fargate", cluster, {
      namespace: "fargate",
    });

    //Example: create an IRSA service account
    //only add a IRSA serviceAccount ex to use for xray-daemon
    //this is the equivalent of eksctl create iamserviceaccount --name xray-daemon --namespace default --cluster EKS-Lab --attach-policy-arn arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess --approve --override-existing-serviceaccounts
    //TODO i would like instead uses arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess as existing policy to attach to my role
    /*
    new ServiceAccountIRSA(this, 'xray-daemon', cluster, {
      iamPolicyFile: 'xray-daemonset.json',
      name: 'xray-daemon',
      namespace: 'default',
    });
     */
  }
}

/*
 ** StatefulCluster (configured using the .env file)
 *
 * This stacks show how you can deploy a stateful application (Cassandra) in EKS
 * We also install lots of addons, such as logging, metrics, ingres, to have a fully functional cluster
 * This stack is for demo purpose
 *
 * The will create an EKS cluster with 3 managed nodegroups, 1 in each AZ - used to store our stateful application
 * It will add a fargate profile for the `fargate` namespace
 * it will create a Spot nodegroup used to launch stress utility for the Cassandra cluster
 * deploy Addons:
 * - AlbIngressController
 * - ExternalDns controller
 * -  MetricServer (used for cluster autoscaler datas)
 * - EbsCsiDriver used to managed EBS volumes
 * -  EksUtilsAdmin - example of an admin pod in managed NG and in Fargate (with logging enabled in sidecar)
 * - CloudWatchAgent - for enabling CloudWatch Container Insights
 * - AwsForFluentBit - for sending logs to CloudWatch logs and ElasticSearch service
 * - KubeOpsView - used to visualize the instances and pods in the EKS cluster (for demo)
 * - CassKop - It's the Cassandra Operator and it's Cassandra Cluster Demo
 * - ServiceAccountIRSA (argo) - simply create a serviceaccount with role for the Argo service
 */
export class StatefulCluster extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    const stack = cdk.Stack.of(this);

    const mastersRole = new iam.Role(this, "AdminRole", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const clusterVersion =
      this.node.tryGetContext("cluster_version") || process.env.cluster_version || DEFAULT_CLUSTER_VERSION;
    const clusterName = this.node.tryGetContext("cluster_name") || process.env.cluster_name || DEFAULT_CLUSTER_NAME;
    const keyName = this.node.tryGetContext("key_name") || process.env.key_name || DEFAULT_KEY_NAME;
    const instanceType = this.node.tryGetContext("instance_type") || process.env.instance_type || "c5d.4xlarge";
    const desiredSize = this.node.tryGetContext("desired_size") || Number(process.env.desired_size) || 4;
    const uid: string = this.node.uniqueId;
    const nid: string = this.node.id;

    const vpc = VpcProvider.getOrCreate(this);

    const cluster = new eks.Cluster(this, "StatefulCluster", {
      vpc: vpc,
      mastersRole: mastersRole,
      clusterName: clusterName,
      version: eks.KubernetesVersion.of(clusterVersion),
      defaultCapacity: 0,
    });

    let AZs = ["AZa", "AZb", "AZc"];

    //az will have value 0, 1, 2
    for (let az in AZs) {
      cluster.addNodegroupCapacity("nodegroup-" + AZs[az], {
        instanceType: new ec2.InstanceType(instanceType),
        minSize: 1,
        desiredSize: desiredSize,
        maxSize: 10,
        forceUpdate: false,
        //releaseVersion: "1.16-202007101208",
        //nodegroupName: clusterName+nid+uid+"-AZa",
        subnets: vpc.selectSubnets({
          subnetType: SubnetType.PRIVATE,
          availabilityZones: [vpc.availabilityZones[az]],
        }),
        labels: {
          "cdk-nodegroup": AZs[az],
        },
        tags: {
          "cdk-nodegroup": AZs[az],
        },
        remoteAccess: {
          sshKeyName: keyName,
        },
        //specify Launch template
        /*
        launchTemplateSpec: {
          id: "xxx",
          version: "1",
        }
        */
      });
    }

    //Add Fargate profile
    // For pod to monitor the rolling upgrad of the nodegroup pods
    cluster.addFargateProfile("FargateProfile", {
      selectors: [
        { namespace: "fargate" },
        {
          namespace: "cassandra",
          labels: {
            type: "fargate",
          },
        },
      ],
    });

    //Add SPot nodegroup with big instances to launch or cassandra stress tool
    const spotAsg = cluster.addAutoScalingGroupCapacity("Spot", {
      instanceType: new ec2.InstanceType("c5.9xlarge"),
      maxInstanceLifetime: cdk.Duration.days(7),
      minCapacity: 1,
      //desiredCapacity: 1,
      updateType: UpdateType.ROLLING_UPDATE,
      rollingUpdateConfiguration: {
        maxBatchSize: 1,
      },
      maxCapacity: 5,
      //https://eu-west-1.console.aws.amazon.com/ec2sp/v2/home?region=eu-west-1#/spot
      spotPrice: "1.728",
      keyName: keyName,
    });
    //allow the Spot Nodegroup to send and receive traffic from our EKS cluster
    spotAsg.connections.allowFrom(
      ec2.SecurityGroup.fromSecurityGroupId(this, "clusterSG", cluster.clusterSecurityGroupId),
      ec2.Port.allTraffic(),
      "allow all traffic from cluster security group"
    );
    spotAsg.connections.allowTo(
      ec2.SecurityGroup.fromSecurityGroupId(this, "spotAsgEgress", cluster.clusterSecurityGroupId),
      ec2.Port.allTraffic(),
      "allow all traffic to the cluster Security group"
    );

    // ADD Ads-Ons

    new K8sAddsOns(this, "k8sAddOns", cluster, props);

    new cdk.CfnOutput(this, "AZOutput", { value: vpc.availabilityZones.join(",") });
  }
}

/*
 ** StatefulSpotCluster (configured using the .env file)
 *
 * This stacks show how you can deploy a stateful application (Cassandra) in EKS
 * We also install lots of addons, such as logging, metrics, ingres, to have a fully functional cluster
 * This stack is for demo purpose
 *
 * The will create an EKS cluster with 3 managed nodegroups, 1 in each AZ - used to store our stateful application
 * It will add a fargate profile for the `fargate` namespace
 * it will create a Spot nodegroup used to launch stress utility for the Cassandra cluster
 * deploy Addons:
 * - AlbIngressController
 * - ExternalDns controller
 * -  MetricServer (used for cluster autoscaler datas)
 * - EbsCsiDriver used to managed EBS volumes
 * -  EksUtilsAdmin - example of an admin pod in managed NG and in Fargate (with logging enabled in sidecar)
 * - CloudWatchAgent - for enabling CloudWatch Container Insights
 * - AwsForFluentBit - for sending logs to CloudWatch logs and ElasticSearch service
 * - KubeOpsView - used to visualize the instances and pods in the EKS cluster (for demo)
 * - CassKop - It's the Cassandra Operator and it's Cassandra Cluster Demo
 * - ServiceAccountIRSA (argo) - simply create a serviceaccount with role for the Argo service
 */
export class StatefulSpotCluster extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    const stack = cdk.Stack.of(this);

    const mastersRole = new iam.Role(this, "AdminRole", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    const clusterVersion =
      this.node.tryGetContext("cluster_version") || process.env.cluster_version || DEFAULT_CLUSTER_VERSION;
    const clusterName = this.node.tryGetContext("cluster_name") || process.env.cluster_name || DEFAULT_CLUSTER_NAME;
    const keyName = this.node.tryGetContext("key_name") || process.env.key_name || DEFAULT_KEY_NAME;
    const instanceType = this.node.tryGetContext("instance_type") || process.env.instance_type || "c5d.4xlarge";
    const desiredSize = this.node.tryGetContext("desired_size") || Number(process.env.desired_size) || 4;
    const uid: string = this.node.uniqueId;
    const nid: string = this.node.id;

    const vpc = VpcProvider.getOrCreate(this);

    const cluster = new eks.Cluster(this, "StatefulCluster", {
      vpc: vpc,
      mastersRole: mastersRole,
      clusterName: clusterName,
      version: eks.KubernetesVersion.of(clusterVersion),
      defaultCapacity: 0,
    });

    let AZs = ["AZa", "AZb", "AZc"];

    //az will have value 0, 1, 2
    for (let az in AZs) {
      //Add SPot nodegroup with big instances to launch or cassandra stress tool
      const spotAsg = cluster.addAutoScalingGroupCapacity("Spot-" + AZs[az], {
        instanceType: new ec2.InstanceType(instanceType),
        //maxInstanceLifetime: cdk.Duration.days(7),
        minCapacity: 1,
        //desiredCapacity: 1,
        updateType: UpdateType.ROLLING_UPDATE,
        rollingUpdateConfiguration: {
          maxBatchSize: 1,
        },
        vpcSubnets: vpc.selectSubnets({
          subnetType: SubnetType.PRIVATE,
          availabilityZones: [vpc.availabilityZones[az]],
        }),
        maxCapacity: 10,
        //https://eu-west-1.console.aws.amazon.com/ec2sp/v2/home?region=eu-west-1#/spot
        spotPrice: "1.728",
        keyName: keyName,
        instanceMonitoring: Monitoring.DETAILED,

        //  autoScalingGroupName
      });
      //allow the Spot Nodegroup to send and receive traffic from our EKS cluster
      spotAsg.connections.allowFrom(
        ec2.SecurityGroup.fromSecurityGroupId(this, "spotAsgIngress" + AZs[az], cluster.clusterSecurityGroupId),
        ec2.Port.allTraffic(),
        "allow all traffic from cluster security group"
      );
      spotAsg.connections.allowTo(
        ec2.SecurityGroup.fromSecurityGroupId(this, "spotAsgEgress" + AZs[az], cluster.clusterSecurityGroupId),
        ec2.Port.allTraffic(),
        "allow all traffic to the cluster Security group"
      );

      /*
            cluster.addNodegroupCapacity('nodegroup-' + AZs[az], {
              instanceType: new ec2.InstanceType(instanceType),
              minSize: 1,
              desiredSize: desiredSize,
              maxSize: 10,
              forceUpdate: false,
              //releaseVersion: "1.16-202007101208",
              //nodegroupName: clusterName+nid+uid+"-AZa",
              subnets: vpc.selectSubnets({
                subnetType: SubnetType.PRIVATE,
                availabilityZones: [
                  vpc.availabilityZones[az],
                ],
              }),
              labels: {
                "cdk-nodegroup": AZs[az],
              },
              tags: {
                "cdk-nodegroup": AZs[az],
              },
              remoteAccess: {
                sshKeyName: keyName,
              },
              //specify Launch template
        
            });
            */
    }

    //Add Fargate profile
    // For pod to monitor the rolling upgrad of the nodegroup pods
    cluster.addFargateProfile("FargateProfile", {
      selectors: [
        { namespace: "fargate" },
        {
          namespace: "cassandra",
          labels: {
            type: "fargate",
          },
        },
      ],
    });

    // ADD Ads-Ons
    new K8sAddsOns(this, "k8sAddOns", cluster, props);

    new cdk.CfnOutput(this, "AZOutput", { value: vpc.availabilityZones.join(",") });
  }
}
