import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecr = require('@aws-cdk/aws-ecr');
import iam = require('@aws-cdk/aws-iam');
import codebuild = require('@aws-cdk/aws-codebuild');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import codepipeline_actions = require('@aws-cdk/aws-codepipeline-actions');
import ecs = require('@aws-cdk/aws-ecs');
import ecsPatterns = require('@aws-cdk/aws-ecs-patterns');
import codecommit = require('@aws-cdk/aws-codecommit');
import { CodeBuildProject } from '@aws-cdk/aws-events-targets';
import { Vpc } from '@aws-cdk/aws-ec2';

const DOCKER_IMAGE_PREFIX = 'fargate-cicd-sample'
const CODECOMMIT_REPO_NAME = 'fargate-cicd-sample'

export interface FargateCICDProps extends cdk.StackProps {
    source?: codebuild.ISource,
    repositoryName?: string,
    defaultVpc?: boolean
    ecrRepoRemovalPolicy?: cdk.RemovalPolicy
}

export class FargateCICD extends cdk.Stack {
    readonly ecrRepository: ecr.Repository

    constructor(scope: cdk.Construct, id: string, props: FargateCICDProps) {
        super(scope, id, props);
        this.ecrRepository = new ecr.Repository(this, 'Repository', {
            repositoryName: props.repositoryName || `${DOCKER_IMAGE_PREFIX}-${this.stackName.toLowerCase()}`,
            removalPolicy: props.ecrRepoRemovalPolicy ? props.ecrRepoRemovalPolicy : cdk.RemovalPolicy.RETAIN
        });

        const buildRole = new iam.Role(this, 'CodeBuildIamRole', {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
        })
        buildRole.addToPolicy(new iam.PolicyStatement({
            resources: ['*'],
            actions: ['ecr:GetAuthorizationToken']
        }));

        buildRole.addToPolicy(new iam.PolicyStatement({
            resources: [`${this.ecrRepository.repositoryArn}*`],
            actions: ['ecr:*']
        }));

        // ECR Lifecycles
        // repository.addLifecycleRule({ tagPrefixList: ['prod'], maxImageCount: 9999 });
        this.ecrRepository.addLifecycleRule({ maxImageAge: cdk.Duration.days(30) });

        const defaultSource = codebuild.Source.bitBucket({
            owner: 'pahud',
            repo: 'express',
            webhook: true,
            webhookFilters: [
                codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs('master'),
            ],
        });

        new codebuild.Project(this, 'CodeBuildProject', {
            role: buildRole,
            source: props.source || defaultSource,
            // Enable Docker AND custom caching
            cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER, codebuild.LocalCacheMode.CUSTOM),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
                privileged: true,
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        'runtime-versions': {
                            docker: 18
                        }
                    },
                    build: {
                        commands: [
                            'TAG=${CODEBUILD_RESOLVED_SOURCE_VERSION}',
                            'LATEST="latest"',
                            'echo "Building image now"',
                            `docker build -t ${this.ecrRepository.repositoryUri}:$LATEST .`,
                            `docker tag ${this.ecrRepository.repositoryUri}:$LATEST ${this.ecrRepository.repositoryUri}:$TAG`,
                            'echo "ECR login now"',
                            '$(aws ecr get-login --no-include-email)',
                            'echo "Pushing to ECR now"',
                            `docker push ${this.ecrRepository.repositoryUri}:$TAG`,
                            `docker push ${this.ecrRepository.repositoryUri}:$LATEST`,
                        ]
                    }
                }
            })
        });

        // const vpc = ec2.Vpc.fromLookup(this, 'VPC', {
        //     isDefault: true
        // })

        const vpc = props.defaultVpc === undefined ? new ec2.Vpc(this, 'VPC') : Vpc.fromLookup(this, 'VPC', { isDefault: true })

        const cluster = new ecs.Cluster(this, 'Cluster', {
            clusterName: 'cdk-samples',
            vpc
        });

        const taskDefinition = new ecs.TaskDefinition(this, 'Task', {
            compatibility: ecs.Compatibility.FARGATE,
            memoryMiB: '512',
            cpu: '256',
            executionRole: new iam.Role(this, 'ExecutionRole', {
                assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            }),
        });

        taskDefinition.addContainer('defaultContainer', {
            image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample')
        }).addPortMappings({
            containerPort: 80
        });

        const fargatesvc = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'AlbSvc', {
            cluster,
            taskDefinition,
        })

        // if the default image is not from ECR, the ECS task execution role will not have ECR pull privileges
        // we need grant the pull for it explicitly
        this.ecrRepository.grantPull({
            grantPrincipal: (fargatesvc.service.taskDefinition.executionRole as iam.IRole)
        })

        // reduce the default deregistration delay timeout from 300 to 30 to accelerate the rolling update
        fargatesvc.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30')
        // customize the healthcheck to speed up the ecs rolling update
        fargatesvc.targetGroup.configureHealthCheck({
            interval: cdk.Duration.seconds(5),
            healthyHttpCodes: '200',
            healthyThresholdCount: 2,
            unhealthyThresholdCount: 3,
            timeout: cdk.Duration.seconds(4),
        })

        // CodePipeline
        const codePipeline = new codepipeline.Pipeline(this, 'Ecr2EcsPipeline', {
            pipelineName: 'Ecr2Ecs',
        });

        const sourceOutputEcr = new codepipeline.Artifact();
        const sourceOutputCodeCommit = new codepipeline.Artifact();
        const sourceActionECR = new codepipeline_actions.EcrSourceAction({
            actionName: 'ECR',
            repository: this.ecrRepository,
            imageTag: 'latest', // optional, default: 'latest'
            output: sourceOutputEcr,
        });

        const codecommitRepo = new codecommit.Repository(this, 'GitRepo', {
            repositoryName: CODECOMMIT_REPO_NAME
        });

        const sourceActionCodeCommit = new codepipeline_actions.CodeCommitSourceAction({
            actionName: 'CodeCommit',
            // repository: codecommit.Repository.fromRepositoryName(this, 'GitRepo', CODECOMMIT_REPO_NAME),
            repository: codecommitRepo,
            output: sourceOutputCodeCommit,
        });

        codePipeline.addStage({
            stageName: 'Source',
            actions: [sourceActionCodeCommit, sourceActionECR],
        });

        codePipeline.addStage({
            stageName: 'Deploy',
            actions: [
                new codepipeline_actions.EcsDeployAction({
                    actionName: 'DeployAction',
                    service: fargatesvc.service,
                    // if your file is called imagedefinitions.json,
                    // use the `input` property,
                    // and leave out the `imageFile` property
                    input: sourceOutputCodeCommit,
                    // if your file name is _not_ imagedefinitions.json,
                    // use the `imageFile` property,
                    // and leave out the `input` property
                    // imageFile: sourceOutput.atPath('imageDef.json'),
                }),
            ],
        });
        new cdk.CfnOutput(this, 'ServiceURL', {
            value: `http://${fargatesvc.loadBalancer.loadBalancerDnsName}`
        })

        new cdk.CfnOutput(this, 'StackId', {
            value: this.stackId
        })

        new cdk.CfnOutput(this, 'StackName', {
            value: this.stackName
        })

        new cdk.CfnOutput(this, 'CodeCommitRepoName', {
            value: codecommitRepo.repositoryName
        })

        let codeCommitHint = `
Create a "imagedefinitions.json" file and git add/push into CodeCommit repository "${CODECOMMIT_REPO_NAME}" with the following value:

[
  {
    "name": "defaultContainer",
    "imageUri": "${this.ecrRepository.repositoryUri}:latest"
  }
]
`
        new cdk.CfnOutput(this, 'Hint', {
            value: codeCommitHint
        })

        new cdk.CfnOutput(this, 'CodeBuildProjectName', {
            value: CodeBuildProject.name
        })

        new cdk.CfnOutput(this, 'EcrRepoName', {
            value: this.ecrRepository.repositoryName
        })

        new cdk.CfnOutput(this, 'DeleteEcrRepoCommand', {
            value: `
            aws ecr --region ${this.region} delete-repository --repository-name ${this.ecrRepository.repositoryName} --force
            `
        })
    }
}