import cdk = require('@aws-cdk/core');
import { Vpc } from '@aws-cdk/aws-ec2';
import { Cluster, ContainerImage, TaskDefinition, Compatibility } from '@aws-cdk/aws-ecs';
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';

export class FargateAlbSvcStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = this.node.tryGetContext('use_default_vpc') ? Vpc.fromLookup(this, 'VPC', {
      isDefault: true
    }) : new Vpc(this, 'VPC', {
      maxAzs: 3,
      natGateways:1
    })

    const cluster = new Cluster(this, 'Cluster', {
      vpc
    })

    const taskDefinition = new TaskDefinition(this, 'Task', {
      compatibility: Compatibility.FARGATE,
      memoryMiB: '512',
      cpu: '256'
    })

    taskDefinition
      .addContainer('php', {
        image: ContainerImage.fromRegistry('abiosoft/caddy:php'),
      })
      .addPortMappings({
        containerPort: 2015
      })

    const svc = new ApplicationLoadBalancedFargateService(this, 'FargateService', {
      cluster,
      taskDefinition
    })

    new cdk.CfnOutput(this, 'FargateServiceURL', {
      value: `http://${svc.loadBalancer.loadBalancerDnsName}/`
    })

  }
}

