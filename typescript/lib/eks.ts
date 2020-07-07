import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import { Stack } from '@aws-cdk/core';
import { VpcProvider } from './vpc';

const DEFAULT_CLUSTER_VERSION = '1.16'

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

    const pod = cluster.addResource('mypod2', {
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
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION

    const vpc = VpcProvider.getOrCreate(this)

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'EKSMiniCluster', {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
      defaultCapacity: 0
    });

    cluster.addCapacity('Spot', {
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

