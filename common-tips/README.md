# Common Tips



## Import or Create the VPC

Most of the time you probably would not create a new VPC as it takes a long time for 
your development iteration.

Consider the code below

```ts
// use an existing vpc or create a new one
const vpc = this.node.tryGetContext('use_default_vpc') === '1' ?
    ec2.Vpc.fromLookup(this, 'Vpc', { isDefault: true }) :
    this.node.tryGetContext('use_vpc_id') ?
    ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: this.node.tryGetContext('use_vpc_id') }) :
    new ec2.Vpc(this, 'Vpc', { maxAzs: 3, natGateways: 1 });

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

## Passing and Retrieving Variables

In AWS CDK, you can get variables from context variables or enveironment variables.
Some production workload even load parameters from external managed service such as 
[AWS System Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)


Consider the following sample, the `get_var` function will just try get the required variables or parameters from `context variable`, `environment variable` and eventually a custom JSON file. 

```ts
// read in the config JSON
const config_json_path = path.join(__dirname + '/' + 'custom.config.json')
const cm: {[key:string]:string} = JSON.parse(fs.readFileSync(config_json_path).toString())

// get the var 
function get_var(scope: Scope, key: string, configMap: { [key: string]: string } ): string {
  return scope.node.tryGetContext(key) ?? process.env[key] ?? configMap[key] ?? undefined
}

const clusterName = get_var(this, 'clusterName', cm)
const clusterArn = get_var(this, 'clusterArn', cm)
const clusterEndpoint = get_var(this, 'clusterEndpoint', cm)
```

Similarly, it's also very straight-forward to load your custom configuration from provided YAML file.

```ts
const config = yaml.safeLoad(fs.readFileSync("./config/" + configFileName + ".yaml", "utf8"));
```
_yaml sample provided by [Noah Liu](https://t.me/AWSCDK/2348) and [Angus Lee](https://t.me/angusfz)_

TODO: extend this sample to get `AWS SSM Parameter Store`.




