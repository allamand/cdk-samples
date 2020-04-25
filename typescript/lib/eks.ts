import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');

export class EksStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = this.node.tryGetContext('use_default_vpc') ? ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true }) :
      new ec2.Vpc(this, 'Vpc', {
        maxAzs: 3,
        natGateways: 1
      });

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'EKSCluster', {
      vpc,
      mastersRole,
    });

    new cdk.CfnOutput(this, 'Region', { value: this.region })
  }
}

export class EksFargate extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = this.node.tryGetContext('use_default_vpc') ? ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true }) :
      new ec2.Vpc(this, 'Vpc', {
        maxAzs: 3,
        natGateways: 1
      });

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.FargateCluster(this, 'EKSFargateCluster', {
      vpc,
      mastersRole,
    });

    new cdk.CfnOutput(this, 'Region', { value: this.region })
  }
}

export class Bottlerocket extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = this.node.tryGetContext('use_default_vpc') ? ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true }) :
      new ec2.Vpc(this, 'Vpc', {
        maxAzs: 3,
        natGateways: 1
      });

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'EKSCluster', {
      vpc,
      mastersRole,
      defaultCapacity: 0
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

    new cdk.CfnOutput(this, 'Region', { value: this.region })
  }
}

