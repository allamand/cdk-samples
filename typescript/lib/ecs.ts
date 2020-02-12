import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import iam = require('@aws-cdk/aws-iam');
import autoscaling = require('@aws-cdk/aws-autoscaling');
import ecsPatterns = require('@aws-cdk/aws-ecs-patterns');
import { EcsOptimizedAmi } from '@aws-cdk/aws-ecs';

export class EcsEc2Stack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    function capitalizeKeys(o: any): any {
      return Object.keys(o).reduce((res, k) => ({ ...res, [capitalize(k)]: o[k] }), {});
    }

    function capitalize(s: string): string {
      return s.charAt(0).toUpperCase() + s.slice(1);
    }

    const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      isDefault: true
    })

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc
    });

    // cluster.addCapacity('AsgSpot1', {
    //   maxCapacity: 1,
    //   minCapacity: 1,
    //   desiredCapacity: 1,
    //   instanceType: new ec2.InstanceType('c5.xlarge'),
    //   spotPrice: '0.0722',
    //   spotInstanceDraining: true
    // });

    // cluster.addCapacity('AsgSpot2', {
    //   maxCapacity: 1,
    //   minCapacity: 1,
    //   desiredCapacity: 1,
    //   instanceType: new ec2.InstanceType('c5.large'),
    //   spotPrice: '0.0333',
    //   spotInstanceDraining: true
    // });

    // cluster.addCapacity('AsgOd', {
    //   maxCapacity: 2,
    //   minCapacity: 1,
    //   desiredCapacity: 1,
    //   instanceType: new ec2.InstanceType('t3.large'),
    // })

    // Mixed ASG with launch template
    const mixedAsg = cluster.addCapacity('AsgMixed', {
      maxCapacity: 10,
      minCapacity: 3,
      instanceType: new ec2.InstanceType('t3.large'),
    })  

    const instanceTypes = [
      new ec2.InstanceType('m5.large'), 
      new ec2.InstanceType('c5.large'),
      new ec2.InstanceType('t3.large'), 
    ];

    const instancesDistribution = {
      spotInstancePools: 10,
      onDemandBaseCapacity: 1,
      onDemandPercentageAboveBaseCapacity: 0
    };

    const instanceProfile = new iam.CfnInstanceProfile(this, "InstProfile", {
      roles: [mixedAsg.role.roleName]
    });

    const launchTemplate = new ec2.CfnLaunchTemplate(this, "LaunchTemplate", {
      launchTemplateData: {
        userData: cdk.Fn.base64(mixedAsg.userData.render()),
        securityGroupIds: mixedAsg.connections.securityGroups.map(sg => sg.securityGroupId),
        imageId: new EcsOptimizedAmi().getImage(this).imageId,
        ebsOptimized: true,
        iamInstanceProfile: { arn: instanceProfile.attrArn },
      }
    });

    const cfnMixedAsg = mixedAsg.node.defaultChild as autoscaling.CfnAutoScalingGroup;
    cfnMixedAsg.addPropertyDeletionOverride('LaunchConfigurationName');

    cfnMixedAsg.addPropertyOverride("MixedInstancesPolicy", {
      InstancesDistribution: instancesDistribution ? capitalizeKeys(instancesDistribution) : undefined,
      LaunchTemplate: {
        LaunchTemplateSpecification: {
          LaunchTemplateId: launchTemplate.ref,
          Version: launchTemplate.attrLatestVersionNumber
        },
        Overrides: instanceTypes.map(t => ({ InstanceType: t.toString() }))
      }
    });  


    const taskDefinition = new ecs.TaskDefinition(this, 'Task', {
      compatibility: ecs.Compatibility.EC2,
      memoryMiB: '1024',
      cpu: '512',
    })

    const logGroupName = this.stackName

    taskDefinition
      .addContainer('flask', {
        image: ecs.ContainerImage.fromAsset('../python/flask-docker-app'),
        memoryReservationMiB: 512,
        environment: {
          PLATFORM: 'Amazon ECS'
        },
        logging: ecs.LogDrivers.firelens({
          options: {
            Name: 'cloudwatch',
            region: this.region,
            // disable the log_key to send full JSON event log to cloudwatch
            // log_key: 'log',
            log_group_name: logGroupName,
            auto_create_group: 'true',
            log_stream_prefix: 'flask-'
          }
        })
      })
      .addPortMappings({
        containerPort: 5000
      });

    new cdk.CfnOutput(this, 'CloudwatchLogGrupURL', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#logStream:group=${logGroupName}`
    })

    const webSvc = new ecsPatterns.ApplicationLoadBalancedEc2Service(this, 'webSvc', {
      cluster,
      taskDefinition,
      desiredCount: 2,
    })

    new cdk.CfnOutput(this, 'ALBSvcURL', {
      value: `http://${webSvc.loadBalancer.loadBalancerDnsName}`
    })

  }
}

