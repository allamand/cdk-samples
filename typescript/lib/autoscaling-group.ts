import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as autoscaling from '@aws-cdk/aws-autoscaling';
import { VpcProvider } from './vpc';

export class AutoscalingGroupStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = VpcProvider.getOrCreate(this);

    // create ASG with explicit subnet IDs
    new autoscaling.AutoScalingGroup(this, 'ASG', {
      instanceType: new ec2.InstanceType('t3.large'),
      machineImage: new ec2.AmazonLinuxImage(),
      vpc,
      vpcSubnets: {
        subnets: [
          ec2.Subnet.fromSubnetAttributes(this, 'subnetA', {
            subnetId: 'subnet-aaaa',
            availabilityZone: 'ap-northeast-1a',
          }),
          ec2.Subnet.fromSubnetAttributes(this, 'subnetB', {
            subnetId: 'subnet-bbbb',
            availabilityZone: 'ap-northeast-1b',
          }),
          ec2.Subnet.fromSubnetAttributes(this, 'subnetC', {
            subnetId: 'subnet-cccc',
            availabilityZone: 'ap-northeast-1c',
          }),
        ]
      }
    })
  }
}
