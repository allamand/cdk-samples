import { SynthUtils } from '@aws-cdk/assert';
import * as eks from '../lib/eks';
import '@aws-cdk/assert/jest';
import {App} from "@aws-cdk/core";
import * as vpc from '../lib/vpc';
import {DEFAULT_KEY_NAME} from "../lib/defaults";


test('Test eks creation CloudFormation Snapshot', () => {
    //const stack = new cdk.Stack();
    const app = new App();
    const stack = new eks.AlbIngressControllerStack(app, 'EKS');
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});


/*
    expect(stack).toHaveResource('AWS::CloudWatch::Alarm', {
        MetricName: "ApproximateNumberOfMessagesVisible",
        Namespace: "AWS/SQS",
        Dimensions: [
            {
                Name: "QueueName",
                Value: { "Fn::GetAtt": [ "DLQ581697C4", "QueueName" ] }
            }
        ],
    });
*/


test('Test Multi-AZ CassKop', () => {
    //const stack = new cdk.Stack();
    // GIVEN
    const app = new App();
    const env = {
        region: app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION || "eu-west-1",
        account: app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT || "xxxxxxxxxxxx"
    };
    

    // WHEN
    const stack = new eks.CassKopCluster(app, 'Casskop', {env});

    // THEN
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

    expect(stack).toHaveResource('AWS::EC2::VPC', {
        EnableDnsSupport: true,
        CidrBlock: "10.0.0.0/16",
        Tags:  [{
            "Key": "Name",
            "Value": "Casskop/Vpc",
        },],
    });

    expect(stack).toHaveResource('AWS::EKS::Nodegroup', {
        //AmiType: "AL2_x86_64",
        InstanceTypes: [
            "m5.large",
        ],
        Labels:  {
            "cdk-nodegroup": "AZa",
        },
        NodegroupName: "CdkEksCluster-AZa",
        RemoteAccess:  {
            "Ec2SshKey":  DEFAULT_KEY_NAME,
        },
        ScalingConfig: {
            "DesiredSize": 1,
            "MaxSize": 10,
            "MinSize": 1,
        },
        Tags:  {
            "cdk-nodegroup": "AZa",
        },
        Subnets: [{
            "Ref": "VpcPrivateSubnet1Subnet536B997A",
        },],
    });

    expect(stack).toHaveResource('AWS::EKS::Nodegroup', {
        //AmiType: "AL2_x86_64",
        InstanceTypes: [
            "m5.large",
        ],
        Labels:  {
            "cdk-nodegroup": "AZb",
        },
        NodegroupName: "CdkEksCluster-AZb",
        RemoteAccess:  {
            "Ec2SshKey":  DEFAULT_KEY_NAME,
        },
        ScalingConfig: {
            "DesiredSize": 1,
            "MaxSize": 10,
            "MinSize": 1,
        },
        Tags:  {
            "cdk-nodegroup": "AZb",
        },
        Subnets: [{
            "Ref": "VpcPrivateSubnet2Subnet3788AAA1",
        },],
    });

    expect(stack).toHaveResource('AWS::EKS::Nodegroup', {
        //AmiType: "AL2_x86_64",
        InstanceTypes: [
            "m5.large",
        ],
        Labels:  {
            "cdk-nodegroup": "AZc",
        },
        NodegroupName: "CdkEksCluster-AZc",
        RemoteAccess:  {
            "Ec2SshKey":  DEFAULT_KEY_NAME,
        },
        ScalingConfig: {
            "DesiredSize": 1,
            "MaxSize": 10,
            "MinSize": 1,
        },
        Tags:  {
            "cdk-nodegroup": "AZc",
        },
        Subnets: [{
            "Ref": "VpcPrivateSubnet3SubnetF258B56E",
        },],
    });

});
