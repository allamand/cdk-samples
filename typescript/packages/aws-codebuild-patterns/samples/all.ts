import cdk = require('@aws-cdk/core');
import { Stack } from '@aws-cdk/core';
import { ScheduledBuild, ScheduledDockerBuild } from '../lib/autobuild';
import { Topic } from '@aws-cdk/aws-sns';
import codebuild = require('@aws-cdk/aws-codebuild');
import events = require('@aws-cdk/aws-events');
import s3 = require('@aws-cdk/aws-s3');
import iam = require('@aws-cdk/aws-iam');


const S3_STAGE_BUCKET = 'pahud-tmp-us-east-1'


export class AutoBuild extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props)

    const topicArn = `arn:aws:sns:${Stack.of(this).region}:${Stack.of(this).account}:SNS2IM`
    const topic = Topic.fromTopicArn(this, 'Topic', topicArn);
    const region = Stack.of(this).region
    const account = Stack.of(this).account

    /**
     * pahud/lambda-layer-eksctl
     */

    const build = new ScheduledBuild(this, 'BuildLambdaLayerEksctl', {
      projectName: 'eksctl-autobuild',
      ecrRepoRemovalPolicy: cdk.RemovalPolicy.DESTROY,
      source: codebuild.Source.gitHub({
        owner: 'pahud',
        repo: 'lambda-layer-eksctl',
      }),
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
        privileged: true,
        environmentVariables: {
          AWS_DEFAULT_REGION: {
            value: 'us-east-1'
          },
          AWS_REGION: {
            value: 'us-east-1'
          },
          SNS_TOPIC_ARN: {
            value: `arn:aws:sns:${region}:${account}:SNS2IM`
          }
        }
      },
      schedule: events.Schedule.rate(cdk.Duration.days(1))
    })


    // allow codebuild role to assume to itself to get the temporary credentials
    build.project.role!.grant(build.project.role!, 'sts:AssumeRole')

    // allow codebuild role to upload stage assets to the s3 bucket
    s3.Bucket.fromBucketName(this, 'stageBucket', S3_STAGE_BUCKET).grantPut(build.project.role!)

    // allow codebuild role to publish SNS topic to notify the autobuild result
    topic.grantPublish(build.project.role!)

    // allow codebuild role to publish/update app to SAR
    build.project.role!.addToPolicy(new iam.PolicyStatement({
      actions: ['serverlessrepo:CreateApplication'],
      resources: [`arn:aws:serverlessrepo:us-east-1:${account}:applications/*`]
    }))
    build.project.role!.addToPolicy(new iam.PolicyStatement({
      actions: ['serverlessrepo:UpdateApplication', 'serverlessrepo:CreateApplicationVersion'],
      resources: [`arn:aws:serverlessrepo:us-east-1:${account}:applications/aws-lambda-layer-eksctl`]
    }))


    /**
     * pahud/lambda-layer-botocorte
     */
    const buildAwsSdkBotocore = new ScheduledBuild(this, 'BuildLambdaLayerAwsSdkBotocore', {
      projectName: 'lambda-layer-botocore-autobuild',
      ecrRepoRemovalPolicy: cdk.RemovalPolicy.DESTROY,
      source: codebuild.Source.gitHub({
        owner: 'pahud',
        repo: 'aws-lambda-layer-botocore',
      }),
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
        privileged: true,
        environmentVariables: {
          AWS_DEFAULT_REGION: {
            value: 'us-east-1'
          },
          AWS_REGION: {
            value: 'us-east-1'
          },
          SNS_TOPIC_ARN: {
            value: `arn:aws:sns:${region}:${account}:SNS2IM`
          }
        }
      },
      schedule: events.Schedule.rate(cdk.Duration.days(1)),
    })


    // allow codebuild role to assume to itself to get the temporary credentials
    buildAwsSdkBotocore.project.role!.grant(buildAwsSdkBotocore.project.role!, 'sts:AssumeRole')

    // allow codebuild role to upload stage assets to the s3 bucket
    s3.Bucket.fromBucketName(this, 'stageBucketAwsSdkBotocore', S3_STAGE_BUCKET).grantPut(buildAwsSdkBotocore.project.role!)

    // allow codebuild role to publish SNS topic to notify the autobuild result
    topic.grantPublish(buildAwsSdkBotocore.project.role!)

    // allow codebuild role to publish/update app to SAR
    buildAwsSdkBotocore.project.role!.addToPolicy(new iam.PolicyStatement({
      actions: ['serverlessrepo:CreateApplication'],
      resources: [`arn:aws:serverlessrepo:us-east-1:${account}:applications/*`]
    }))
    buildAwsSdkBotocore.project.role!.addToPolicy(new iam.PolicyStatement({
      actions: ['serverlessrepo:UpdateApplication', 'serverlessrepo:CreateApplicationVersion'],
      resources: [`arn:aws:serverlessrepo:us-east-1:${account}:applications/lambda-layer-botocore`]
    }))

    /**
     * pahud/lambda-layer-aws-sdk-js
     */
    const buildAwsSdkJs = new ScheduledBuild(this, 'BuildLambdaLayerAwsSdkJs', {
      projectName: 'lambda-layer-aws-sdk-js-autobuild',
      ecrRepoRemovalPolicy: cdk.RemovalPolicy.DESTROY,
      source: codebuild.Source.gitHub({
        owner: 'pahud',
        repo: 'lambda-layer-aws-sdk-js',
      }),
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
        privileged: true,
        environmentVariables: {
          AWS_DEFAULT_REGION: {
            value: 'us-east-1'
          },
          AWS_REGION: {
            value: 'us-east-1'
          },
          SNS_TOPIC_ARN: {
            value: `arn:aws:sns:${region}:${account}:SNS2IM`
          }
        }
      },
      schedule: events.Schedule.rate(cdk.Duration.days(1))
    })


    // allow codebuild role to assume to itself to get the temporary credentials
    buildAwsSdkJs.project.role!.grant(buildAwsSdkJs.project.role!, 'sts:AssumeRole')

    // allow codebuild role to upload stage assets to the s3 bucket
    s3.Bucket.fromBucketName(this, 'stageBucketAwsSdkJs', S3_STAGE_BUCKET).grantPut(buildAwsSdkJs.project.role!)

    // allow codebuild role to publish SNS topic to notify the autobuild result
    topic.grantPublish(buildAwsSdkJs.project.role!)

    // allow codebuild role to publish/update app to SAR
    buildAwsSdkJs.project.role!.addToPolicy(new iam.PolicyStatement({
      actions: ['serverlessrepo:CreateApplication'],
      resources: [`arn:aws:serverlessrepo:us-east-1:${account}:applications/*`]
    }))
    buildAwsSdkJs.project.role!.addToPolicy(new iam.PolicyStatement({
      actions: ['serverlessrepo:UpdateApplication', 'serverlessrepo:CreateApplicationVersion'],
      resources: [`arn:aws:serverlessrepo:us-east-1:${account}:applications/lambda-layer-aws-sdk-js`]
    }))


    /**
     * pahud/sam-cli-docker
     */
    const samcli = new ScheduledDockerBuild(this, 'BuildSamCli', {
      projectName: 'samcli-docker-autobuild',
      source: codebuild.Source.gitHub({
        owner: 'pahud',
        repo: 'sam-cli-docker'
      }),
      schedule: events.Schedule.rate(cdk.Duration.days(1)),
      repositoryName: 'samcli-docker-autobuild',
      timeout: cdk.Duration.hours(1),
      ecrRepoRemovalPolicy: cdk.RemovalPolicy.DESTROY
    })

    // /**
    //  * aws/aws-cdk
    //  */
    // new ScheduledDockerBuild(this, 'BuildAwsCdk', {
    //   projectName: 'awscdk-autobuild',
    //   source: codebuild.Source.gitHub({
    //     owner: 'aws',
    //     repo: 'aws-cdk'
    //   }),
    //   schedule: events.Schedule.rate(cdk.Duration.days(1)),
    //   repositoryName: 'awscdk-daily-autobuild',
    //   timeout: cdk.Duration.hours(6),
    //   ecrRepoRemovalPolicy: cdk.RemovalPolicy.DESTROY
    // })

    /**
     * pahud/amazonlinux-docker-autobuild
     */
    new ScheduledDockerBuild(this, 'BuildAmazonlinuxDocker', {
      projectName: 'amazonlinux-docker-autobuild',
      source: codebuild.Source.gitHub({
        owner: 'pahud',
        repo: 'amazonlinux-docker-autobuild'
      }),
      schedule: events.Schedule.rate(cdk.Duration.days(1)),
      repositoryName: 'amazonlinux-docker-autobuild',
      timeout: cdk.Duration.hours(4),
      ecrRepoRemovalPolicy: cdk.RemovalPolicy.DESTROY
    })

    /**
     * aws/aws-cdk
     */
    const awscdkAutoBuild = new ScheduledBuild(this, 'AwscdkAutoBuild', {
      projectName: 'awscdk-docker-autobuild',
      ecrRepoRemovalPolicy: cdk.RemovalPolicy.DESTROY,
      source: codebuild.Source.gitHub({
        owner: 'aws',
        repo: 'aws-cdk',
      }),
      buildspec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              docker: 18
            }
          },
          pre_build: {
            commands: [
              'docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD'
            ]
          },
          build: {
            commands: [
              'echo "Building image now"',
              'wget https://raw.githubusercontent.com/aws/aws-cdk/5f2025583dba511dc6430f889eed01c53c1ba5aa/Dockerfile -O Dockerfile.new',
              'docker build -t pahud/aws-cdk-autobuild --build-arg BUILD_ARGS="--skip-test" -f Dockerfile.new .',
              `docker push pahud/aws-cdk-autobuild:latest`,
            ]
          }
        }
      }),
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
        privileged: true,
        environmentVariables: {
          DOCKER_USERNAME: {
            value: '/CodeBuild/DOCKER_USERNAME',
            type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE
          },
          DOCKER_PASSWORD: {
            value: '/CodeBuild/DOCKER_PASSWORD',
            type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE
          },
          SNS_TOPIC_ARN: {
            value: `arn:aws:sns:${region}:${account}:SNS2IM`
          }
        }
      },
      schedule: events.Schedule.rate(cdk.Duration.days(1)),
      timeout: cdk.Duration.hours(6)
    })
    // allow codebuild role to ssm get parameters
    awscdkAutoBuild.project.role!.addToPolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameters'],
      resources: [
        `arn:aws:ssm:${region}:${account}:parameter/CodeBuild/DOCKER_USERNAME`,
        `arn:aws:ssm:${region}:${account}:parameter/CodeBuild/DOCKER_PASSWORD`,
      ]
    }))

    /**
     * pahud/sam-cli-docker
     */
    const samcliBuild = new ScheduledBuild(this, 'BuildSamCliDocker', {
      projectName: 'samcli-autobuild',
      ecrRepoRemovalPolicy: cdk.RemovalPolicy.DESTROY,
      source: codebuild.Source.gitHub({
        owner: 'pahud',
        repo: 'sam-cli-docker',
      }),
      buildEnvironment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
        privileged: true,
        environmentVariables: {
          DOCKER_USERNAME: {
            value: '/CodeBuild/DOCKER_USERNAME',
            type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE
          },
          DOCKER_PASSWORD: {
            value: '/CodeBuild/DOCKER_PASSWORD',
            type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE
          },
          SNS_TOPIC_ARN: {
            value: `arn:aws:sns:${region}:${account}:SNS2IM`
          }
        }
      },
      schedule: events.Schedule.rate(cdk.Duration.days(1))
    })

    // allow codebuild role to ssm get parameters
    samcliBuild.project.role!.addToPolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameters'],
      resources: [
        `arn:aws:ssm:${region}:${account}:parameter/CodeBuild/DOCKER_USERNAME`,
        `arn:aws:ssm:${region}:${account}:parameter/CodeBuild/DOCKER_PASSWORD`,
      ]
    }))


  }
}

const app = new cdk.App()

const env = {
  region: app.node.tryGetContext('region') || process.env.CDK_INTEG_REGION || process.env.CDK_DEFAULT_REGION,
  account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT
};

new AutoBuild(app, 'AutoBuildAll', { env })