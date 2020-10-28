import { SynthUtils } from '@aws-cdk/assert';
import * as eks from '../lib/eks';
import '@aws-cdk/assert/jest';
import { App } from "@aws-cdk/core";
import * as vpc from '../lib/vpc';
import { DEFAULT_KEY_NAME } from "../lib/defaults";


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


test('Test Multi-AZ Stateful', () => {
    //const stack = new cdk.Stack();
    // GIVEN
    const app = new App({
        context: {
            "home_ip": "45.43.42.41",
            "vpc_ip_cidr": "10.0.0.0/16",
            "instance_type": "c5d.2xlarge",
            "desired_size": 1,
        }
    });
    const env = {
        region: app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION || "eu-west-1",
        account: app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT || "xxxxxxxxxxxx"
    };


    // WHEN
    //const stack = new eks.StatefulCluster(app, 'Casskop', { env });
    const stack = new eks.StatefulCluster(app, 'Casskop', { env });

    // THEN

    //expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

    expect(stack).toHaveResource('AWS::EC2::VPC', {
        EnableDnsSupport: true,
        CidrBlock: "10.0.0.0/16",
        Tags: [{
            "Key": "Name",
            "Value": "Casskop/Vpc",
        },],
    });

    expect(stack).toHaveResource('AWS::EKS::Nodegroup', {
        InstanceTypes: [
            "c5d.2xlarge"
        ],
        Labels: {
            "cdk-nodegroup": "AZa",
        },
        //NodegroupName: "CdkEksCluster-AZa",
        RemoteAccess: {
            "Ec2SshKey": DEFAULT_KEY_NAME,
        },
        ScalingConfig: {
            "DesiredSize": 1,
            "MaxSize": 10,
            "MinSize": 1,
        },
        Tags: {
            "cdk-nodegroup": "AZa",
        },
        Subnets: [{
            "Ref": "VpcPrivateSubnet1Subnet536B997A",
        },],
    });

    expect(stack).toHaveResource('AWS::EKS::Nodegroup', {
        //AmiType: "AL2_x86_64",
        InstanceTypes: [
            "c5d.2xlarge"
        ],
        Labels: {
            "cdk-nodegroup": "AZb",
        },
        //NodegroupName: "CdkEksCluster-AZb",
        RemoteAccess: {
            "Ec2SshKey": DEFAULT_KEY_NAME,
        },
        ScalingConfig: {
            "DesiredSize": 1,
            "MaxSize": 10,
            "MinSize": 1,
        },
        Tags: {
            "cdk-nodegroup": "AZb",
        },
        Subnets: [{
            "Ref": "VpcPrivateSubnet2Subnet3788AAA1",
        },],
    });

    expect(stack).toHaveResource('AWS::EKS::Nodegroup', {
        //AmiType: "AL2_x86_64",
        InstanceTypes: [
            "c5d.2xlarge"
        ],
        Labels: {
            "cdk-nodegroup": "AZc",
        },
        //NodegroupName: "CdkEksCluster-AZc",
        RemoteAccess: {
            "Ec2SshKey": DEFAULT_KEY_NAME,
        },
        ScalingConfig: {
            "DesiredSize": 1,
            "MaxSize": 10,
            "MinSize": 1,
        },
        Tags: {
            "cdk-nodegroup": "AZc",
        },
        Subnets: [{
            "Ref": "VpcPrivateSubnet3SubnetF258B56E",
        },],
    });

    expect(stack).toHaveResource('Custom::AWSCDK-EKS-HelmChart', {
        "Release": "aws-for-fluent-bit",
        "Repository": "https://aws.github.io/eks-charts",
        "Values": {
            "Fn::Join": [
                "",
                [
                    "{\"serviceAccount\":{\"create\":false,\"name\":\"aws-for-fluent-bit\"},\"cloudWatch\":{\"enabled\":true,\"region\":\"eu-west-1\",\"logStreamName\":\"CassKop\",\"logGroupName\":\"/aws/eks/",
                    {
                        "Ref": "StatefulClusterF2661197"
                    },
                    "/logs\"},\"elasticsearch\":{\"enabled\":true,\"awsRegion\":\"eu-west-1\"},\"firehose\":{\"enabled\":false},\"kinesis\":{\"enabled\":false}}"
                ]
            ]
        },
    });

    //TODO Update ALB ingress controller and add test

    expect(stack).toHaveResource('Custom::AWSCDK-EKS-HelmChart', {
        "Release": "kube-ops-view",
        "Repository": "https://kubernetes-charts.storage.googleapis.com",
        "CreateNamespace": true,
        "Values": "{\"service\":{\"type\":\"ClusterIP\"},\"redis\":{\"enabled\":false},\"rbac\":{\"create\":true},\"ingress\":{\"enabled\":true,\"path\":\"/*\",\"hostname\":\"kube-ops-view.eu-west-1.demo.domain.com\",\"annotations\":{\"kubernetes.io/ingress.class\":\"alb\",\"alb.ingress.kubernetes.io/scheme\":\"internet-facing\",\"alb.ingress.kubernetes.io/target-type\":\"ip\",\"alb.ingress.kubernetes.io/actions.ssl-redirect\":\"{\\\"Type\\\": \\\"redirect\\\", \\\"RedirectConfig\\\": { \\\"Protocol\\\": \\\"HTTPS\\\", \\\"Port\\\": \\\"443\\\", \\\"StatusCode\\\": \\\"HTTP_301\\\"}}\",\"alb.ingress.kubernetes.io/listen-ports\":\"[{\\\"HTTP\\\": 80}, {\\\"HTTPS\\\":443}]\",\"alb.ingress.kubernetes.io/certificate-arn\":\"arn:aws:acm:eu-west-1:xxxxxxxxxxx:certificate/aaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee\",\"force\":\"update\"}}}",
        "Wait": true,
    });


    expect(stack).toHaveResource('Custom::AWSCDK-EKS-HelmChart', {
        "Release": "casskop",
        "Chart": "cassandra-operator",
        "Namespace": "cassandra",
        "Repository": "https://orange-kubernetes-charts-incubator.storage.googleapis.com/",
        "CreateNamespace": true,
        "Wait": true,
    });

    /*
        expect(stack).toHaveResource('Custom::AWSCDK-EKS-KubernetesResource', {
            "ClusterName": {
                "Ref": "StatefulClusterF2661197",
            },
            "Manifest": "[{\"apiVersion\":\"apps/v1\",\"kind\":\"Deployment\",\"metadata\":{\"annotations\":{\"deployment.kubernetes.io/revision\":\"1\"},\"name\":\"eksutils-deployment\",\"labels\":{\"app\":\"eksutils\"},\"namespace\":\"cassandra\"},\"spec\":{\"replicas\":1,\"revisionHistoryLimit\":10,\"selector\":{\"matchLabels\":{\"app\":\"eksutils\"}},\"strategy\":{\"rollingUpdate\":{\"maxSurge\":\"25%\",\"maxUnavailable\":\"25%\"},\"type\":\"RollingUpdate\"},\"template\":{\"metadata\":{\"labels\":{\"app\":\"eksutils\"}},\"spec\":{\"containers\":[{\"name\":\"eksutils\",\"image\":\"allamand/eksutils:latest\",\"imagePullPolicy\":\"Always\",\"command\":[\"tail\",\"-f\",\"/dev/null\"],\"ports\":[{\"containerPort\":8080,\"name\":\"http\",\"protocol\":\"TCP\"}],\"resources\":{\"requests\":{\"cpu\":\"300m\",\"memory\":\"512Mi\"}},\"volumeMounts\":[{\"name\":\"varlog\",\"mountPath\":\"/var/log\"}]},{\"name\":\"aws-for-fluentbit\",\"image\":\"amazon/aws-for-fluent-bit:latest\",\"imagePullPolicy\":\"Always\",\"volumeMounts\":[{\"name\":\"varlog\",\"mountPath\":\"/var/log\"},{\"name\":\"aws-for-fluentbit\",\"mountPath\":\"/fluent-bit/etc/\"}]}],\"enableServiceLinks\":true,\"restartPolicy\":\"Always\",\"schedulerName\":\"default-scheduler\",\"serviceAccountName\":\"eksutils-admin\",\"terminationGracePeriodSeconds\":0,\"securityContext\":{\"fsGroup\":0,\"runAsUser\":0}}},\"terminationGracePeriodSeconds\":10,\"volumes\":[{\"name\":\"varlog\",\"emptyDir\":{}},{\"name\":\"aws-for-fluentbit\",\"configMap\":{\"name\":\"aws-for-fluentbit\"}}]}},{\"apiVersion\":\"rbac.authorization.k8s.io/v1beta1\",\"kind\":\"ClusterRoleBinding\",\"metadata\":{\"name\":\"eksutils-admin-cassandra\"},\"roleRef\":{\"apiGroup\":\"rbac.authorization.k8s.io\",\"kind\":\"ClusterRole\",\"name\":\"cluster-admin\"},\"subjects\":[{\"kind\":\"ServiceAccount\",\"name\":\"eksutils-admin\",\"namespace\":\"cassandra\"}]},{\"apiVersion\":\"v1\",\"kind\":\"ConfigMap\",\"metadata\":{\"name\":\"aws-for-fluent-bit\",\"namespace\":\"kube-system\",\"labels\":{\"k8s-app\":\"fluent-bit\"}},\"data\":{\"fluent-bit.conf\":\"[SERVICE]\\n    Parsers_File /fluent-bit/parsers/parsers.conf\\n\\n[INPUT]\\n    Name              tail\\n    Tag               *.logs\\n    Path              /var/log/*.log\\n    DB                /var/log/logs.db\\n    Mem_Buf_Limit     5MB\\n    Skip_Long_Lines   On\\n    Refresh_Interval  10\\n[FILTER]\\n    Name                kubernetes\\n    Match               kube.*\\n    Kube_URL            https://kubernetes.default.svc.cluster.local:443\\n    Merge_Log           On\\n    Merge_Log_Key       data\\n    K8S-Logging.Parser  On\\n    K8S-Logging.Exclude On\\n[OUTPUT]\\n    Name                  cloudwatch\\n    Match                 *\\n    region                eu-west-1\\n    log_group_name        /aws/eks/CassKop/logs\\n    log_stream_name       CassKop\\n    log_stream_prefix      fargate-\\n    auto_create_group     true\\n[OUTPUT]\\n    Name            es\\n    Match           *\\n    AWS_Region      eu-west-1\\n    AWS_Auth        On\\n    Host            search-eks-casskop-xxxxxxxxxxxxxxxxxx.eu-west-1.es.amazonaws.com\\n    Port            443\\n    TLS             On\\n    Retry_Limit     6\\n\"}}]",
        });
        
        */
        expect(stack).toHaveResource('Custom::AWSCDK-EKS-KubernetesResource', {
             "Manifest": "[{\"kind\":\"ClusterRoleBinding\",\"apiVersion\":\"rbac.authorization.k8s.io/v1\",\"metadata\":{\"name\":\"cloudwatch-agent-role-binding\"},\"subjects\":[{\"kind\":\"ServiceAccount\",\"name\":\"cloudwatch-agent\",\"namespace\":\"amazon-cloudwatch\"}],\"roleRef\":{\"kind\":\"ClusterRole\",\"name\":\"cloudwatch-agent-role\",\"apiGroup\":\"rbac.authorization.k8s.io\"}}]",
            "ClusterName": {
              "Ref": "StatefulClusterF2661197"
            },
            "RoleArn": {
              "Fn::GetAtt": [
                "StatefulClusterCreationRoleDDC50F64",
                "Arn"
              ]
            },
        });

    //Finally Check Snapshot
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
