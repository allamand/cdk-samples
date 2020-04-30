import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');

export class CdkVpcOnlyStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // use an existing vpc or create a new one
        const vpc = this.node.tryGetContext('use_default_vpc') === '1' ?
            ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true }) :
            this.node.tryGetContext('use_vpc_id') ?
                ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: this.node.tryGetContext('use_vpc_id') }) :
                new ec2.Vpc(this, 'Vpc', { maxAzs: 3, natGateways: 1 });
        
        new cdk.CfnOutput(this, 'Region', { value: cdk.Stack.of(this).region })
        new cdk.CfnOutput(this, 'VpcId', { value: vpc.vpcId, exportName: 'CdkVpcOnly' })
    }
}