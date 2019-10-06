import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecsPatterns = require('@aws-cdk/aws-ecs-patterns');


export class EcsEc2Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      isDefault: true
    })

    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: 'cdk-samples',
      vpc
    });

    cluster.addCapacity('asgSpot', {
      maxCapacity: 1,
      minCapacity: 1,
      desiredCapacity: 1,
      instanceType: new ec2.InstanceType('c5.xlarge'),
      spotPrice: '0.0735',

    });

    cluster.addCapacity('asgOd', {
      maxCapacity: 10,
      minCapacity: 2,
      desiredCapacity: 2,
      instanceType: new ec2.InstanceType('t3.large'),
    })

    const taskDefinition = new ecs.TaskDefinition(this, 'Task', {
      compatibility: ecs.Compatibility.FARGATE,
      memoryMiB: '512',
      cpu: '256'
    })

    taskDefinition.addContainer('flask', {
      image: ecs.ContainerImage.fromAsset('../python/flask-docker-app'),
      environment: {
        PLATFORM: 'Amazon ECS'
      },
    }).addPortMappings({
      containerPort: 5000
    });

    const webSvc = new ecsPatterns.ApplicationLoadBalancedEc2Service(this, 'webSvc', {
      cluster,
      taskDefinition,
      desiredCount: 3
    })

    new cdk.CfnOutput(this, 'ALBSvcURL', {
      value: `http://${webSvc.loadBalancer.loadBalancerDnsName}`
    })

  }
}

