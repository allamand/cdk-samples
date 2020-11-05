# cdk-samples in TypeScript

A curated list of AWS CDK samples in **TypeScript**.

Make sure you run `npm install` to instrall required packages defined in `packages.json` and `npm run build` to compile typescript to javascript.

For example:

```bash
$ cd cdk-samples/typescript
# install the latest aws-cdk in typescript
$ npm i -g aws-cdk
# install all required packages
$ npm i
# run 'cdk bootstrap' to generate the staging s3 bucket(only for the 1st time)
$ cdk bootstrap

```

# Available Sample Libraries

check the list defined in the [factory](https://github.com/pahud/cdk-samples/blob/2c253c2e9293c72de47e4150d3a7d333648567cd/typescript/bin/cdk-samples.ts#L28)

# Deploy Stack(s)

As all stack classes are imported into a single [cdk-samples.ts](bin/cdk-samples.ts) yet will not initiate the object unless you enable it. That being said, you need enable the stack before you can deploy it, e.g.

```bash
# enable and deploy the EksStack
cdk diff EksStack -c enable_stack=EksStack
cdk deploy EksStack -c enable_stack=EksStack
# in some cases, you might need enable multiple stacks
cdk diff 'Eks*' -c enable_stack=EksStack,EksFargate
```

Some Stacks are also using an environnement configuration file, you can copy the sample `cp .env.template .env` and edit the values.

There is a Makefile that can help launching cdk using the values from the `.env` file:

```
 make deploy STACK=EksStack
 #or
 make diff STACK=StatefulCluster
```

# Deploy in the default VPC or any existing VPC

You may deploy the stack in your existing VPC to save the deployment time

```bash

# enable and deploy the EksStack in my default vpc
cdk deploy EksStack -c enable_stack=EksStack -c use_default_vpc=1
# enable and deploy the EksStack in vpc-123456
cdk deploy EksStack -c enable_stack=EksStack -c use_vpc_id=vpc-123456
```

> or just put the use_vps_id in the .env file

# Deploy with different AWS_PROFILE

```bash
cdk --profile another diff EksStack -c enable_stack=EksStack
```

# Deploy into a different AWS region

```bash
# let's presume the default region is us-east-1 and we are deploying to ap-northeast-1
AWS_REGION=ap-northeast-1 cdk diff EksStack -c enable_stack=EksStack
```

# Testing

The stack had some unitary tests which are configured with the `.env.template` file.

you can execute them with

```bash
make test
```

# Available NPM Packages

The following samples were published in npmjs as a standalone package you may import as a CDK construct library. Most of them are still in a very early stage and not recommended for production.

- [x] **[@pahud/aws-serverless-patterns](packages/aws-serverless-patterns/)** [![npm version](https://badge.fury.io/js/%40pahud%2Faws-serverless-patterns.svg)](https://badge.fury.io/js/%40pahud%2Faws-serverless-patterns)
- [x] **[@pahud/aws-codebuild-patterns](packages/aws-codebuild-patterns/)** [![npm version](https://badge.fury.io/js/%40pahud%2Faws-codebuild-patterns.svg)](https://badge.fury.io/js/%40pahud%2Faws-codebuild-patterns)
- [x] **[@pahud/aws-fargate-cicd](packages/aws-fargate-cicd/)** [![npm version](https://badge.fury.io/js/%40pahud%2Faws-fargate-cicd.svg)](https://badge.fury.io/js/%40pahud%2Faws-fargate-cicd)

# Working with AddOns

See aws-for-fluent-bit logs

kubectl -n kube-system logs -l app.kubernetes.io/name=aws-for-fluent-bit -f

ES:

# name of our elasticsearch cluster

export ES_DOMAIN_NAME="eks-casskop"

# Elasticsearch version

export ES_VERSION="7.4"

# kibana admin user

export ES_DOMAIN_USER="casskop"

# kibana admin password

#export ES_DOMAIN_PASSWORD="$(openssl rand -base64 12)_Ek1$"
export ES_DOMAIN_PASSWORD=uN5icT3Pr5AeHrrs_Ek1\$

# Download and update the template using the variables created previously

curl -sS https://www.eksworkshop.com/intermediate/230_logging/deploy.files/es_domain.json \
 | envsubst > ~/environment/eks/logging/es_domain.json


const prodDomain = new es.Domain(this, 'Domain', {
    version: es.ElasticsearchVersion.V7_1,
    capacity: {
        masterNodes: 5,
        dataNodes: 20
    },
    ebs: {
        volumeSize: 20
    },
    zoneAwareness: {
        availabilityZoneCount: 3
    },code pak  
    logging: {
        slowSearchLogEnabled: true,
        appLogEnabled: true,
        slowIndexLogEnabled: true,
    },
});



# Create the cluster

aws es create-elasticsearch-domain \
 --cli-input-json file://~/environment/eks/logging/es_domain.json

Wait for ES to be ready

if [[ $(aws es describe-elasticsearch-domain --domain-name ${ES_DOMAIN_NAME} --query 'DomainStatus.Processing') == "false" ]]
then
tput setaf 2; echo "The Elasticsearch cluster is ready"
else
tput setaf 1;echo "The Elasticsearch cluster is NOT ready"
fi

# We need to retrieve the Fluent Bit Role ARN

export FLUENTBIT_ROLE=$(kubectl -n kube-system get sa aws-for-fluent-bit -o yaml | yq r - 'metadata.annotations."eks.amazonaws.com/role-arn"')
export FLUENTBIT_ROLE_FARGATE=$(kubectl -n cassandra get sa eksutils-admin -o yaml | yq r - 'metadata.annotations."eks.amazonaws.com/role-arn"')

# Get the Elasticsearch Endpoint

export ES_ENDPOINT=$(aws es describe-elasticsearch-domain --domain-name ${ES_DOMAIN_NAME} --output text --query "DomainStatus.Endpoint")

# Update the Elasticsearch internal database


export ES_DOMAIN_NAME="eks-spot"
export ES_DOMAIN_USER="master-user"
export ES_DOMAIN_PASSWORD='T3k^/OLdI-Xx!!fm!e%#6EM49|YQzS5F'
export ES_ENDPOINT=$(aws es describe-elasticsearch-domain --domain-name ${ES_DOMAIN_NAME} --output text --query "DomainStatus.Endpoint")
export FLUENTBIT_ROLE=$(kubectl -n kube-system get sa aws-for-fluent-bit -o yaml | yq r - 'metadata.annotations."eks.amazonaws.com/role-arn"')
curl -sS -u "${ES_DOMAIN_USER}:${ES_DOMAIN_PASSWORD}" \
 -X PATCH \
 "https://${ES_ENDPOINT}/_opendistro/_security/api/rolesmapping/all_access?pretty" \
    -H 'Content-Type: application/json' \
    -d'
[
  {
    "op": "add", "path": "/backend_roles", "value": ["'${FLUENTBIT_ROLE}'"]    
},
{
    "op": "add", "path": "/users", "value": ["arn:aws:iam::382076407153:role/demo3"]
}
]
'
