import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import { Stack } from '@aws-cdk/core';
import { VpcProvider } from './vpc';

const DEFAULT_CLUSTER_VERSION = '1.16'
const DEFAULT_CLUSTER_NAME = 'default-cluster-name'

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
    // const clusterName = this.node.tryGetContext('cluster_name') ?? DEFAULT_CLUSTER_NAME

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 3, 
      natGateways: 1,
    })

    const cluster = new eks.Cluster(this, 'EKSMiniCluster', {
      vpc,
      mastersRole,
      version: eks.KubernetesVersion.of(clusterVersion),
      defaultCapacity: 0,
    });

    cluster.addCapacity('Spot', {
      instanceType: new ec2.InstanceType('t3.medium'),
      maxInstanceLifetime: cdk.Duration.days(7),
      minCapacity: 1,
      spotPrice: '0.05',
    })

    /**
     * dynamic add required policies for the service account
     * 
     * credit to t.me/zxkane
     */
    const albIngressControllerVersion = 'v1.1.8';
    const albNamespace = 'kube-system';
    const albBaseResourceBaseUrl = `https://raw.githubusercontent.com/kubernetes-sigs/aws-alb-ingress-controller/${albIngressControllerVersion}/docs/examples/`;
    const albIngressControllerPolicyUrl = `${albBaseResourceBaseUrl}iam-policy.json`;

    const sa = cluster.addServiceAccount('sa-alb-ingress', {
      name: 'alb-ingress',
      namespace: albNamespace,
    })

    const request = require('sync-request');
    const policyJson = request('GET', albIngressControllerPolicyUrl).getBody();
    ((JSON.parse(policyJson))['Statement'] as []).forEach((statement, idx, array) => {
      sa.addToPolicy(iam.PolicyStatement.fromJson(statement));
    });

    const yaml = require('js-yaml');
    const rbacRoles = yaml.safeLoadAll(request('GET', `${albBaseResourceBaseUrl}rbac-role.yaml`).getBody())
      .filter((rbac: any) => { return rbac['kind'] != 'ServiceAccount' });
    const albDeployment = yaml.safeLoad(request('GET', `${albBaseResourceBaseUrl}alb-ingress-controller.yaml`).getBody());

    const albResources = cluster.addResource('aws-alb-ingress-controller', ...rbacRoles, albDeployment);
    const albResourcePatch = new eks.KubernetesPatch(this, `alb-ingress-controller-patch-${albIngressControllerVersion}`, {
      cluster,
      resourceName: "deployment/alb-ingress-controller",
      resourceNamespace: albNamespace,
      applyPatch: {
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: 'alb-ingress-controller',
                  args: [
                    '--ingress-class=alb',
                    '--feature-gates=wafv2=false',
                    `--cluster-name=${cluster.clusterName}`,
                    `--aws-vpc-id=${vpc.vpcId}`,
                    `--aws-region=${stack.region}`,
                  ]
                }
              ]
            }
          }
        }
      },
      restorePatch: {
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: 'alb-ingress-controller',
                  args: [
                    '--ingress-class=alb',
                    '--feature-gates=wafv2=false',
                    `--cluster-name=${cluster.clusterName}`,
                  ]
                }
              ]
            }
          }
        }
      },
    });
    albResourcePatch.node.addDependency(albResources);
    new cdk.CfnOutput(this, 'PodRole', { value: sa.role.roleName })
  }
}
