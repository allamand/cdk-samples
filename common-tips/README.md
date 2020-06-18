# Common Tips



## Import or Create the VPC

Most of the time you probably would not create a new VPC as it takes a long time for 
your development iteration.

Consider the code below

```ts
function getOrCreateVpc(scope: cdk.Construct): ec2.IVpc {
  // use an existing vpc or create a new one
  const vpc = scope.node.tryGetContext('use_default_vpc') === '1' ?
    ec2.Vpc.fromLookup(scope, 'Vpc', { isDefault: true }) :
    scope.node.tryGetContext('use_vpc_id') ?
      ec2.Vpc.fromLookup(scope, 'Vpc', { vpcId: scope.node.tryGetContext('use_vpc_id') }) :
      new ec2.Vpc(scope, 'Vpc', { maxAzs: 3, natGateways: 1 });

  return vpc;
}
```

And create your `vpc` in your construct class like this

```ts
const vpc = getOrCreateVpc(this);
```

To even simplify it

```ts
import { VpcProvider } from './vpc';

export class Foo extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // use an existing vpc or create a new one
    const vpc = VpcProvider.getOrCreate(this)
  }
}
```



Now you can use any existing VPC 

```sh
# to use the default VPC
cdk diff -c use_default_vpc=1
# to use any existing VpcID
cdk diff -c use_vpc_id=vpc-xxxxxxx
```

or just create a new VPC with single NAT Gateway if you do not pass the context 
variables as above.

## Passing Variables

In AWS CDK, you can get variables from context variables or enveironment variables.
Some production workload even load parameters from external managed service such as 
[AWS System Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)


Consider the following sample, the `get_var` function will just try get the required variables or parameters from `context variable`, `environment variable` and eventually a custom JSON file. 

```ts
// read in the config JSON
const config_json_path = path.join(__dirname + '/' + 'custom.config.json')
const cm: {[key:string]:string} = JSON.parse(fs.readFileSync(config_json_path).toString())

// get the var 
function get_var(scope: Scope, configMap: { [key: string]: string }, key: string): string {
  return scope.node.tryGetContext(key) ?? process.env[key] ?? configMap[key] ?? undefined
}

const clusterName = get_var(this, cm, 'clusterName')
const clusterArn = get_var(this, cm, 'clusterArn')
const clusterEndpoint = get_var(this, cm, 'clusterEndpoint')
```

Similarly, it's also very straight-forward to load your custom configuration from provided YAML file.

```ts
const config = yaml.safeLoad(fs.readFileSync("./config/" + configFileName + ".yaml", "utf8"));
```
_yaml sample provided by [Noah Liu](https://t.me/AWSCDK/2348) and [Angus Lee](https://t.me/angusfz)_

TODO: extend this sample to get `AWS SSM Parameter Store`.

## Running CDK in Typescript without compiling the TS to JS

Given we have a single CDK file in typescript like this

<details>
    <summary>demo.ts</summary>
    
```ts
import * as sns from '@aws-cdk/aws-sns';
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import * as sqs from '@aws-cdk/aws-sqs';
import * as cdk from '@aws-cdk/core';

export interface FooProps {
  /**
   * The visibility timeout to be configured on the SQS Queue, in seconds.
   *
   * @default Duration.seconds(300)
   */
  visibilityTimeout?: cdk.Duration;
}

export class Foo extends cdk.Construct {
  /** @returns the ARN of the SQS queue */
  public readonly queueArn: string;

  constructor(scope: cdk.Construct, id: string, props: FooProps = {}) {
    super(scope, id);

    const queue = new sqs.Queue(this, 'FooQueue', {
      visibilityTimeout: props.visibilityTimeout || cdk.Duration.seconds(300)
    });

    const topic = new sns.Topic(this, 'FooTopic');

    topic.addSubscription(new subs.SqsSubscription(queue));

    this.queueArn = queue.queueArn;
  }
}

const app = new cdk.App()
const stack = new cdk.Stack(app, 'FooStack')
new Foo(stack, 'Foo')
```
</details>

We don't have to always compile .ts to .js before we can run it, simply

```bash
npx cdk —app 'npx ts-node demo.ts' diff -c foo=bar
```

<details>
    <summary>And we get the cdk output immediately</summary>
    
```
Resources
[+] AWS::SQS::Queue Foo/FooQueue FooFooQueue09977CB5 
[+] AWS::SQS::QueuePolicy Foo/FooQueue/Policy FooFooQueuePolicyD99A076D 
[+] AWS::SNS::Subscription Foo/FooQueue/FooStackFooFooTopic92385123 FooFooQueueFooStackFooFooTopic923851233A020E7E 
[+] AWS::SNS::Topic Foo/FooTopic FooFooTopicA67D0BD0 
```
    
</details>



