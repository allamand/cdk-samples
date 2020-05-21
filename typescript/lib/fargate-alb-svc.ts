import * as cdk from '@aws-cdk/core';
import * as ec2  from '@aws-cdk/aws-ec2';
import * as route53 from '@aws-cdk/aws-route53'
import * as acm from '@aws-cdk/aws-certificatemanager';
import { Cluster, ContainerImage, TaskDefinition, Compatibility } from '@aws-cdk/aws-ecs';
import * as ecsPatterns from '@aws-cdk/aws-ecs-patterns';
import { VpcProvider } from './vpc';


export class FargateAlbSvcStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // use an existing vpc or create a new one
    const vpc = VpcProvider.getOrCreate(this)

    const cluster = new Cluster(this, 'Cluster', {
      vpc
    })

    const taskDefinition = new TaskDefinition(this, 'Task', {
      compatibility: Compatibility.FARGATE,
      memoryMiB: '512',
      cpu: '256'
    })

    taskDefinition
      .addContainer('main', {
        image: ContainerImage.fromRegistry('pahud/amazon-ecs-flask-sample'),
        environment: {
          PLATFORM: 'AWS Fargate'
        }
      })
      .addPortMappings({
        containerPort: 80
      })

    const domainName = this.node.tryGetContext('domain_name');
    const zoneName = this.node.tryGetContext('zone_name')
    const certificate = this.node.tryGetContext('acm_cert_arn') ? acm.Certificate.fromCertificateArn(this, 'ImportedCert', this.node.tryGetContext('acm_cert_arn')) : undefined

    // create the Fargate service with ALB and configure the Route53 domain name and hosted zone when necessary
    const svc = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'FargateService', {
      cluster,
      taskDefinition,
      certificate,
      domainName,
      domainZone: zoneName ? new route53.HostedZone(this, 'DemoZone', { zoneName }) : undefined
    })

    new cdk.CfnOutput(this, 'FargateServiceURL', {
      value: `http://${svc.loadBalancer.loadBalancerDnsName}/`
    })

  }
}


