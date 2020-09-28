import {App} from "@aws-cdk/core";
import * as vpc from "../lib/vpc";
import {SynthUtils} from "@aws-cdk/assert";


test('Test vpc creation', () => {

    const app = new App();
    const stack = new vpc.VpcProvider(app, 'VPC');
    const myVpc = vpc.VpcProvider.getOrCreate(stack);
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});



test('Test use use_vpc_id', () => {
    const app = new App(  )

    const stack = new vpc.VpcProvider(app, 'VPC',  {
        env: {
            account: process.env.CDK_DEFAULT_ACCOUNT,
            region: process.env.CDK_DEFAULT_REGION
            },
    });
    stack.node.setContext("use_vpc_id", 'vpc-xxxxxxxx');
    const myVpc = vpc.VpcProvider.getOrCreate(stack);
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

