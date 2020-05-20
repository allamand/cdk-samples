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

or jsut create a new VPC with single NAT Gateway if you do not pass the context 
variables as above.

## Passing and Retrieving Variables

In AWS CDK, you can get variables from context variables or enveironment variables.
Some production workload even load parameters from external managed service such as 
[AWS System Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)

