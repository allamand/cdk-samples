import cdk = require('@aws-cdk/core');
import ecr = require('@aws-cdk/aws-ecr');
import iam = require('@aws-cdk/aws-iam');
import codebuild = require('@aws-cdk/aws-codebuild');
import events = require('@aws-cdk/aws-events');
import targets = require('@aws-cdk/aws-events-targets');
import { Stack } from '@aws-cdk/core';

const NAME_PREFIX = 'autobuild'

export interface BaseScheduledBuildProps extends cdk.StackProps {
  projectName?: string
  source?: codebuild.ISource
  schedule?: events.Schedule
  repositoryName?: string
  timeout?: cdk.Duration
  ecrRepoRemovalPolicy?: cdk.RemovalPolicy
  buildEnvironment?: codebuild.BuildEnvironment
}

export interface ScheduledBuildProps extends BaseScheduledBuildProps {
  buildspec?: codebuild.BuildSpec
}

/**
 * Scheduled build with the provided buildspec yaml
 */
export class ScheduledBuild extends cdk.Construct {
  readonly ecrRepository: ecr.Repository
  readonly source: codebuild.ISource
  readonly schedule: events.Schedule
  readonly project: codebuild.Project
  readonly buildEnvironment?: codebuild.BuildEnvironment


  constructor(scope: cdk.Construct, id: string, props: ScheduledBuildProps) {
    super(scope, id);


    // const stackNameLowerCase = Stack.of(this).stackName.toLowerCase()
    this.ecrRepository = new ecr.Repository(this, 'Repository', {
      // repositoryName: props.repositoryName === undefined ? props.projectName : props.repositoryName,
      repositoryName: props.repositoryName,
      removalPolicy: props.ecrRepoRemovalPolicy ? props.ecrRepoRemovalPolicy : cdk.RemovalPolicy.RETAIN
    });

    this.ecrRepository.addLifecycleRule({ maxImageAge: cdk.Duration.days(30) });

    this.source = props.source === undefined ?
      codebuild.Source.gitHub({
        owner: 'aws',
        repo: 'aws-cdk'
      }) : props.source

    const rule = new events.Rule(this, 'Rule', {
      schedule: props.schedule == undefined ? events.Schedule.rate(cdk.Duration.days(1)) : props.schedule,
    })

    const project = new codebuild.Project(this, 'CodeBuildProject', {
      // role: buildRole,
      projectName: props.projectName,
      source: this.source,
      timeout: props.timeout,
      badge: true,
      // Enable Docker AND custom caching
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER, codebuild.LocalCacheMode.CUSTOM),
      environment: props.buildEnvironment ? props.buildEnvironment :
        {
          buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
          privileged: true,
        },
      buildSpec: props.buildspec
    });
    this.project = project
    this.buildEnvironment = props.buildEnvironment
    this.ecrRepository.grantPullPush(project.role!)
    rule.addTarget(new targets.CodeBuildProject(project));
  }
}



export class ScheduledDockerBuild extends cdk.Construct {
  readonly projectName?: string
  readonly ecrRepository: ecr.Repository
  readonly source: codebuild.ISource
  readonly schedule: events.Schedule

  constructor(scope: cdk.Construct, id: string, props: ScheduledBuildProps) {
    super(scope, id);

    const stackNameLowerCase = Stack.of(this).stackName.toLowerCase()
    this.ecrRepository = new ecr.Repository(this, 'Repository', {
      // repositoryName: props.repositoryName === undefined ? `${NAME_PREFIX}-${stackNameLowerCase}` : props.repositoryName,
      repositoryName: props.repositoryName,
      removalPolicy: props.ecrRepoRemovalPolicy ? props.ecrRepoRemovalPolicy : cdk.RemovalPolicy.RETAIN
    });

    this.ecrRepository.addLifecycleRule({ maxImageAge: cdk.Duration.days(30) });

    this.source = props.source === undefined ?
      codebuild.Source.gitHub({
        owner: 'aws',
        repo: 'aws-cdk'
      }) : props.source

    const rule = new events.Rule(this, 'Rule', {
      schedule: props.schedule == undefined ? events.Schedule.rate(cdk.Duration.days(1)) : props.schedule,
    })


    const project = new codebuild.Project(this, 'CodeBuildProject', {
      // role: buildRole,
      projectName: props.projectName,
      source: this.source,
      timeout: props.timeout,
      badge: true,
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

    this.ecrRepository.grantPullPush(project.role!);
    rule.addTarget(new targets.CodeBuildProject(project))
  }
}