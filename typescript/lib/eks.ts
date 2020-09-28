import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import {Stack} from '@aws-cdk/core';
import {VpcProvider} from './vpc';
import {ExternalDns} from "./k8sResources/ExternalDns";
import {AlbIngressController} from "./k8sResources/AlbIngressController";
import {MetricsServer} from "./k8sResources/MetricsServer";
import {
  DEFAULT_CLUSTER_NAME,
  DEFAULT_CLUSTER_VERSION,
  DEFAULT_DOMAIN_ZONE,
  DEFAULT_EXTERNAL_DNS_POLICY,
  DEFAULT_KEY_NAME,
  DEFAULT_SSH_SOURCE_IP_RANGE
} from "./defaults";
import {ClusterAutoscaler} from "./k8sResources/ClusterAutoscaler";
import {EbsCsiDriver} from "./k8sResources/EbsCsiDriver";
import {EksUtilsAdmin} from "./k8sResources/EksUtilsPod";
import {DefaultCapacityType} from "@aws-cdk/aws-eks";
import {SubnetType} from "@aws-cdk/aws-ec2";


export class EksStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION
    const vpc = VpcProvider.getOrCreate(this)
    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    new eks.Cluster(this, 'EKSCluster', {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
    });

    new cdk.CfnOutput(this, 'Region', { value: Stack.of(this).region })
    new cdk.CfnOutput(this, 'ClusterVersion', { value: clusterVersion })
  }
}


// cluster with 2 x m5.large spot instances
export class EksSpot extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION

    // use an existing vpc or create a new one
    const vpc = VpcProvider.getOrCreate(this)

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'EKSCluster', {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
      defaultCapacity: 0
    });

    cluster.addCapacity('Spot', {
      instanceType: new ec2.InstanceType('m5.large'),
      maxInstanceLifetime: cdk.Duration.days(7),
      spotPrice: '0.1',
    })

    new cdk.CfnOutput(this, 'Region', { value: Stack.of(this).region })
    new cdk.CfnOutput(this, 'ClusterVersion', { value: clusterVersion })
  }
}

export class EksIrsa extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION

    // use an existing vpc or create a new one
    const vpc = VpcProvider.getOrCreate(this)

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'EKSCluster', {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
    });

    const sa = cluster.addServiceAccount('MyServiceAccount', {});

    const pod = cluster.addManifest('mypod2', {
      apiVersion: 'v1',
      kind: 'Pod',
      metadata: { name: 'mypod2' },
      spec: {
        serviceAccountName: sa.serviceAccountName,
        containers: [
          {
            name: 'main',
            image: 'pahud/aws-whoami',
            ports: [{ containerPort: 5000 }],
          }
        ]
      }
    });

    pod.node.addDependency(sa);

    new cdk.CfnOutput(this, 'Region', { value: Stack.of(this).region })
    new cdk.CfnOutput(this, 'ClusterVersion', { value: clusterVersion })
    // new cdk.CfnOutput(this, 'SARoleArn', { value: sa.role.roleArn })
  }
}

export class EksFargate extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION

    // use an existing vpc or create a new one
    const vpc = VpcProvider.getOrCreate(this)

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'Cluster', {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
    });

    cluster.addFargateProfile('FargateProfile', {
      selectors: [
        { namespace: 'default' },
        { namespace: 'kube-system' },
      ]
    })

    new cdk.CfnOutput(this, 'Region', { value: Stack.of(this).region })
    new cdk.CfnOutput(this, 'ClusterVersion', { value: clusterVersion })
  }
}

export class Bottlerocket extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION

    // use an existing vpc or create a new one
    const vpc = VpcProvider.getOrCreate(this)

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'EKSCluster', {
      vpc,
      mastersRole,
      defaultCapacity: 0,
      version: eks.KubernetesVersion.of(clusterVersion),
    });

    // add bottlerocket nodes
    const bottlerocketAsg = cluster.addCapacity('BottlerocketNodes', {
      instanceType: new ec2.InstanceType('t3.small'),
      minCapacity: 2,
      machineImageType: eks.MachineImageType.BOTTLEROCKET,
      spotPrice: '0.0272',
      keyName: 'aws-pahud'
    });

    // enable SSM agent for the bottlerocket IAM instance role
    bottlerocketAsg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'))

    new cdk.CfnOutput(this, 'Region', { value: Stack.of(this).region })
    new cdk.CfnOutput(this, 'ClusterVersion', { value: clusterVersion })
  }
}

// Stack with one spot instance only. Ideal for testing only.
export class EksMini extends cdk.Stack {
  readonly cluster: eks.Cluster;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION

    const vpc = VpcProvider.getOrCreate(this)

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    this.cluster = new eks.Cluster(this, 'EKSMiniCluster', {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
      defaultCapacity: 0
    });

    this.cluster.addCapacity('Spot', {
      instanceType: new ec2.InstanceType('t3.medium'),
      maxInstanceLifetime: cdk.Duration.days(7),
      machineImageType: eks.MachineImageType.BOTTLEROCKET,
      minCapacity: 1,
      spotPrice: '0.05',
    })

    new cdk.CfnOutput(this, 'Region', { value: Stack.of(this).region })
    new cdk.CfnOutput(this, 'ClusterVersion', { value: clusterVersion })    
  }
}

export class AlbIngressControllerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    const stack = cdk.Stack.of(this)

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION
    const clusterName = this.node.tryGetContext('cluster_name') ?? DEFAULT_CLUSTER_NAME
    const keyName = this.node.tryGetContext('key_name') ?? DEFAULT_KEY_NAME
    const sshAccessIpCIDR = this.node.tryGetContext('ssh_access_cidr') ?? DEFAULT_SSH_SOURCE_IP_RANGE


    const vpc = VpcProvider.getOrCreate(this)

    const cluster = new eks.Cluster(this, 'AlbIngressControllerStack', {
      vpc: vpc,
      mastersRole: mastersRole,
      clusterName: clusterName,
      version: eks.KubernetesVersion.of(clusterVersion),

      defaultCapacity: 3,
      defaultCapacityInstance: new ec2.InstanceType('t3.medium'),
      defaultCapacityType: DefaultCapacityType.NODEGROUP
    });

    //We can also add other nodesgroups manually

    cluster.addNodegroup('nodegroup', {
      nodegroupName: clusterName+"-addNodeGroup1",
      instanceType: new ec2.InstanceType('m5.large'),
      minSize: 1,
      maxSize: 50,
      labels: {
        "cdk-nodegroup": "addNodegroup1",
      },
      tags: {
        "cdk-nodegroup": "addNodegroup1",
      },
      remoteAccess: {
        sshKeyName: keyName,
      },
    });


    //Add SPot Instances

    const spotAsg = cluster.addCapacity('Spot', {
      instanceType: new ec2.InstanceType('t3.medium'),
      maxInstanceLifetime: cdk.Duration.days(7),
      minCapacity: 1,
      maxCapacity: 20,
      spotPrice: '0.05',
      keyName: keyName,

    });
    spotAsg.connections.allowFrom(ec2.SecurityGroup.fromSecurityGroupId(this, "clusterSG", cluster.clusterSecurityGroupId) , ec2.Port.allTraffic(), "allow all traffic from cluster security group");

    //Add BottleRocket Instances
    /*
    const bottleRocket = cluster.addCapacity('BottlerocketNodes', {
      instanceType: new ec2.InstanceType('t3.small'),
      minCapacity:  2,
      machineImageType: eks.MachineImageType.BOTTLEROCKET
    });
    bottleRocket.connections.allowFrom(ec2.SecurityGroup.fromSecurityGroupId(this, "clusterSG", cluster.clusterSecurityGroupId) , ec2.Port.udp(53), "allow udp 53 from cluster security group");
    */

    //Add Fargate profile
    cluster.addFargateProfile('FargateProfile', {
      selectors: [
        { namespace: 'fargate' },
        { namespace: 'fargate2' },
      ]

    });


    // Deploy ALB Ingress Controller
    new AlbIngressController(this, 'alb-ingress-controller', cluster);

    // Deploy External-DNS Controller
    const externalDNSPolicy = this.node.tryGetContext('EXTERNAL_DNS_POLICY') ?? DEFAULT_EXTERNAL_DNS_POLICY
    const appDomain = this.node.tryGetContext('app_domain') ?? DEFAULT_DOMAIN_ZONE
    new ExternalDns(this, 'extrernal-dns', cluster, {
      domain: appDomain,
      policy: externalDNSPolicy,
      owner: clusterName,
    });

    //Deploy Metrics Server
    new MetricsServer(this, 'metrics-server', cluster);

    //Deploy Cluster Autoscaler
    new ClusterAutoscaler(this, 'cluster-autoscaler', cluster, {});

    //Deploy EbsCsiDriver
    new EbsCsiDriver(this, 'ebs-csi-driver', cluster);

    //Deploy EksUtils admin pod in ektusils namespace
    new EksUtilsAdmin(this, 'eksutils-admin', cluster, {
      namespace: 'eksutils'
    });

    //Deploy EksUtils admin pod in default namespace (backed by fargate)
    new EksUtilsAdmin(this, 'eksutils-admin-fargate', cluster, {
      namespace: 'fargate'
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



export class CassKopCluster extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    const stack = cdk.Stack.of(this)

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION
    const clusterName = this.node.tryGetContext('cluster_name') ?? DEFAULT_CLUSTER_NAME
    const keyName = this.node.tryGetContext('key_name') ?? DEFAULT_KEY_NAME


    const vpc = VpcProvider.getOrCreate(this)

    const cluster = new eks.Cluster(this, 'CassKopCluster', {
      vpc: vpc,
      mastersRole: mastersRole,
      clusterName: clusterName,
      version: eks.KubernetesVersion.of(clusterVersion),
      defaultCapacity: 0,
    });

    cluster.addNodegroup('nodegroup-AZa', {
      instanceType: new ec2.InstanceType('m5.large'),
      minSize: 1,
      desiredSize: 1,
      maxSize: 10,
      nodegroupName: clusterName+"-AZa",
      subnets: vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE,
        availabilityZones: [
          vpc.availabilityZones[0],
        ],
      }),
      labels: {
        "cdk-nodegroup": "AZa",
      },
      tags: {
        "cdk-nodegroup": "AZa",
      },
      remoteAccess: {
        sshKeyName: keyName,
      },
    });


    cluster.addNodegroup('nodegroup-AZb', {
      instanceType: new ec2.InstanceType('m5.large'),
      minSize: 1,
      desiredSize: 1,
      maxSize: 10,
      nodegroupName: clusterName+"-AZb",
      subnets: vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE,
        availabilityZones: [
          vpc.availabilityZones[1],
        ],
      }),
      labels: {
        "cdk-nodegroup": "AZb",
      },
      tags: {
        "cdk-nodegroup": "AZb",
      },
      remoteAccess: {
        sshKeyName: keyName,
      },
    });

    cluster.addNodegroup('nodegroup-AZc', {
      instanceType: new ec2.InstanceType('m5.large'),
      minSize: 1,
      desiredSize: 1,
      maxSize: 10,
      nodegroupName: clusterName+"-AZc",
      subnets: vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE,
        availabilityZones: [
          vpc.availabilityZones[2],
        ],
      }),
      labels: {
        "cdk-nodegroup": "AZc",
      },
      tags: {
        "cdk-nodegroup": "AZc",
      },
      remoteAccess: {
        sshKeyName: keyName,
      },
    });

    //Add SPot Instances

    const spotAsg = cluster.addCapacity('Spot', {
      instanceType: new ec2.InstanceType('t3.medium'),
      maxInstanceLifetime: cdk.Duration.days(7),
      minCapacity: 1,
      maxCapacity: 20,
      spotPrice: '0.05',
      keyName: keyName,

    });
    spotAsg.connections.allowFrom(ec2.SecurityGroup.fromSecurityGroupId(this, "clusterSG", cluster.clusterSecurityGroupId) , ec2.Port.allTraffic(), "allow all traffic from cluster security group");

    //Add BottleRocket Instances
    /*
    const bottleRocket = cluster.addCapacity('BottlerocketNodes', {
      instanceType: new ec2.InstanceType('t3.small'),
      minCapacity:  2,
      machineImageType: eks.MachineImageType.BOTTLEROCKET
    });
    bottleRocket.connections.allowFrom(ec2.SecurityGroup.fromSecurityGroupId(this, "clusterSG", cluster.clusterSecurityGroupId) , ec2.Port.udp(53), "allow udp 53 from cluster security group");
    */

    //Add Fargate profile
    cluster.addFargateProfile('FargateProfile', {
      selectors: [
        { namespace: 'fargate' },
        { namespace: 'fargate2' },
      ]

    });


    // Deploy ALB Ingress Controller
    new AlbIngressController(this, 'alb-ingress-controller', cluster);

    // Deploy External-DNS Controller
    const externalDNSPolicy = this.node.tryGetContext('EXTERNAL_DNS_POLICY') ?? DEFAULT_EXTERNAL_DNS_POLICY
    const appDomain = this.node.tryGetContext('app_domain') ?? DEFAULT_DOMAIN_ZONE
    new ExternalDns(this, 'extrernal-dns', cluster, {
      domain: appDomain,
      policy: externalDNSPolicy,
      owner: clusterName,
    });

    //Deploy Metrics Server
    new MetricsServer(this, 'metrics-server', cluster);

    //Deploy Cluster Autoscaler
    new ClusterAutoscaler(this, 'cluster-autoscaler', cluster, {});

    //Deploy EbsCsiDriver
    new EbsCsiDriver(this, 'ebs-csi-driver', cluster);

    //Deploy EksUtils admin pod in ektusils namespace
    new EksUtilsAdmin(this, 'eksutils-admin', cluster, {
      namespace: 'eksutils'
    });

    //Deploy EksUtils admin pod in default namespace (backed by fargate)
    new EksUtilsAdmin(this, 'eksutils-admin-fargate', cluster, {
      namespace: 'fargate'
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

    new cdk.CfnOutput(this, 'AZOutput', {value: vpc.availabilityZones.join(',')})

  }
}