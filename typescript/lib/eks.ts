import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import { Stack } from '@aws-cdk/core';

const DEFAULT_CLUSTER_VERSION = '1.16'

export class EksStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION

    // use an existing vpc or create a new one
    const vpc = this.node.tryGetContext('use_default_vpc') === '1' ?
      ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true }) :
      this.node.tryGetContext('use_vpc_id') ?
        ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: this.node.tryGetContext('use_vpc_id') }) :
        new ec2.Vpc(this, 'Vpc', { maxAzs: 3, natGateways: 1 });

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'EKSCluster', {
      vpc,
      mastersRole,
      version: clusterVersion,
    });

    new cdk.CfnOutput(this, 'Region', { value: Stack.of(this).region })
    new cdk.CfnOutput(this, 'ClusterVersion', { value: clusterVersion })
  }
}

export class EksFargate extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION

    // use an existing vpc or create a new one
    const vpc = this.node.tryGetContext('use_default_vpc') === '1' ?
      ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true }) :
      this.node.tryGetContext('use_vpc_id') ?
        ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: this.node.tryGetContext('use_vpc_id') }) :
        new ec2.Vpc(this, 'Vpc', { maxAzs: 3, natGateways: 1 });

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'Cluster', {
      vpc,
      mastersRole,
      version: clusterVersion,
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
    const vpc = this.node.tryGetContext('use_default_vpc') === '1' ?
      ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true }) :
      this.node.tryGetContext('use_vpc_id') ?
        ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: this.node.tryGetContext('use_vpc_id') }) :
        new ec2.Vpc(this, 'Vpc', { maxAzs: 3, natGateways: 1 });

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'EKSCluster', {
      vpc,
      mastersRole,
      defaultCapacity: 0,
      version: clusterVersion,
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

