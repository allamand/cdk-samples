import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');

export class VpcProvider extends cdk.Stack {
    public static getOrCreate(scope: cdk.Construct) {
        const stack = cdk.Stack.of(scope)
        const vpc = stack.node.tryGetContext('use_default_vpc') === '1' ?
            ec2.Vpc.fromLookup(stack, 'Vpc', { isDefault: true }) :
            stack.node.tryGetContext('use_vpc_id') ?
                ec2.Vpc.fromLookup(stack, 'Vpc', { vpcId: stack.node.tryGetContext('use_vpc_id') }) :
                new ec2.Vpc(stack, 'Vpc', { maxAzs: 3, natGateways: 1 });

    return vpc
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
