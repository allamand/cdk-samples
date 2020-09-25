import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import { VpcProvider } from './vpc';

export class BastionHost extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = VpcProvider.getOrCreate(this)
    const bas = new ec2.BastionHostLinux(this, 'Bastion', {
      vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: new ec2.InstanceType('t3.large'),
    })

    const homeIp = this.node.tryGetContext('HOME_IP') || undefined
    if(homeIp) {
      console.debug("using homeIp "+ homeIp);
      bas.allowSshAccessFrom(ec2.Peer.ipv4(`${homeIp}/32`))
    }

    new cdk.CfnOutput(this, 'instanceId', { value: bas.instanceId })
    new cdk.CfnOutput(this, 'az', { value: bas.instanceAvailabilityZone })
    new cdk.CfnOutput(this, 'publicIp', { value: bas.instancePublicIp })
    new cdk.CfnOutput(this, 'runCommand', { value: 
      `aws ec2-instance-connect send-ssh-public-key --instance-id ${bas.instanceId} --instance-os-user ec2-user 
      --ssh-public-key file://{PUBLIC_KEY_PATH} --availability-zone ${bas.instanceAvailabilityZone}` })
  }
}
