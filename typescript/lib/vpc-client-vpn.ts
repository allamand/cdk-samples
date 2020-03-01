import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export class ClientVpn extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 3,
      natGateways: 1,
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'ingress',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'application',
          subnetType: ec2.SubnetType.PRIVATE,
        },
        {
          cidrMask: 24,
          name: 'db',
          subnetType: ec2.SubnetType.ISOLATED,
        },
        {
          cidrMask: 27,
          name: 'ovpn',
          subnetType: ec2.SubnetType.ISOLATED,
        }
      ]
    })

    const instance = new ec2.Instance(this, 'Instance', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      vpc,
    })

    new cdk.CfnOutput(this, 'Ec2Ip', { value: instance.instancePrivateIp })

    // allow icmp ping from any internal instance sharing the default vpc security group
    instance.connections.allowInternally(ec2.Port.icmpPing())
    // allow icmp ping from the whole vpc cidr block
    instance.connections.allowFrom(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.icmpPing())

    const certArn = 'arn:aws:acm:us-west-2:112233445566:certificate/16486b7e-e9a5-49c0-bf80-5ab426b1b83b'

    /**
     * AWS client vpn endpoint
     */
    const ep = new ec2.CfnClientVpnEndpoint(this, 'VpcEndpoint', {
      authenticationOptions: [
        {
          type: 'certificate-authentication',
          mutualAuthentication: {
            clientRootCertificateChainArn: certArn,
          }
        }
      ],
      clientCidrBlock: '10.0.252.0/22',
      connectionLogOptions: {
        enabled: false
      },
      serverCertificateArn: certArn,
      splitTunnel: true
    })

    /**
     * Target Network Association and Route
     * associate to private subnet and have a route to 0.0.0.0/0 
     * if you are routing to public internet via the VPN otherwise select the isolated one
     */

    /**
     * will route to the VPC subnets only
     */
    new ec2.CfnClientVpnTargetNetworkAssociation(this, 'Asso', {
      clientVpnEndpointId: ep.ref,
      subnetId: vpc.isolatedSubnets[0].subnetId
    })
    new ec2.CfnClientVpnAuthorizationRule(this, 'Authz', {
      clientVpnEndpointId: ep.ref,
      targetNetworkCidr: vpc.vpcCidrBlock,
      authorizeAllGroups: true,
    })

    /**
     * will route to public internet
     */
    // new ec2.CfnClientVpnTargetNetworkAssociation(this, 'Asso', {
    //   clientVpnEndpointId: ep.ref,
    //   subnetId: vpc.privateSubnets[0].subnetId
    // })
    // new ec2.CfnClientVpnRoute(this, 'Route2', {
    //   clientVpnEndpointId: ep.ref,
    //   destinationCidrBlock: '0.0.0.0/0',
    //   targetVpcSubnetId: vpc.privateSubnets[0].subnetId
    // })
    // new ec2.CfnClientVpnAuthorizationRule(this, 'Authz', {
    //   clientVpnEndpointId: ep.ref,
    //   targetNetworkCidr: '0.0.0.0/0',
    //   authorizeAllGroups: true,
    // })
  }
}
