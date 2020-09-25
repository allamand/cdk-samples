import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import {DEFAULT_CLUSTER_VERSION, DEFAULT_VPC_IP_RANGE} from "./defaults";
import {Stack} from "@aws-cdk/core";

export class VpcProvider extends cdk.Stack {

    public static getOrCreate(scope: cdk.Construct) {



        const stack = cdk.Stack.of(scope)
        const value = stack.node.tryGetContext('use_vpc_id')

        const vpcIpRange = stack.node.tryGetContext('vpc_ip_cidr') ?? DEFAULT_VPC_IP_RANGE
        const vpc = stack.node.tryGetContext('use_default_vpc') === '1' ?
        ec2.Vpc.fromLookup(stack, 'Vpc', { isDefault: true }) :
            stack.node.tryGetContext('use_vpc_id') ?
            ec2.Vpc.fromLookup(stack, 'Vpc', { vpcId: stack.node.tryGetContext('use_vpc_id') }) :
                new ec2.Vpc(stack, 'Vpc', {
                    maxAzs: 4,
                    natGateways: 1,
                    cidr: vpcIpRange,
                    subnetConfiguration: [
                        {
                            cidrMask: 20,
                            name: 'Public',
                            subnetType: ec2.SubnetType.PUBLIC,
                        },
                        {
                            cidrMask: 20,
                            name: 'Private',
                            subnetType: ec2.SubnetType.PRIVATE,
                        },
                    ],
                });

    return vpc
    }
}

export class VpcStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = VpcProvider.getOrCreate(this)

        new cdk.CfnOutput(this, 'VpcId', { value: vpc.vpcId })
            }
}

// const vpc = VpcProvider.getOrCreate(this)


// function getOrCreateVpc(stack: cdk.Stack): ec2.IVpc {
//     // use an existing vpc or create a new one
//     const vpc = stack.node.tryGetContext('use_default_vpc') === '1' ?
//         ec2.Vpc.fromLookup(stack, 'Vpc', { isDefault: true }) :
//         stack.node.tryGetContext('use_vpc_id') ?
//             ec2.Vpc.fromLookup(stack, 'Vpc', { vpcId: stack.node.tryGetContext('use_vpc_id') }) :
//             new ec2.Vpc(stack, 'Vpc', { maxAzs: 3, natGateways: 1 });

//     return vpc
// }
