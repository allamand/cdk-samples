# Pod Security Groups

## Crete RDS SG

```
CLUSTER=CassKop
export VPC_ID=$(aws eks describe-cluster \
    --name $CLUSTER \
    --query "cluster.resourcesVpcConfig.vpcId" \
    --output text)

# create RDS security group
aws ec2 create-security-group \
    --description 'RDS SG' \
    --group-name 'RDS_SG' \
    --vpc-id ${VPC_ID}

# save the security group ID for future use
export RDS_SG=$(aws ec2 describe-security-groups \
    --filters Name=group-name,Values=RDS_SG Name=vpc-id,Values=${VPC_ID} \
    --query "SecurityGroups[0].GroupId" --output text)

echo "RDS security group ID: ${RDS_SG}"
```

## Create Pod SG

```
# create the POD security group
aws ec2 create-security-group \
    --description 'POD SG' \
    --group-name 'POD_SG' \
    --vpc-id ${VPC_ID}

# save the security group ID for future use
export POD_SG=$(aws ec2 describe-security-groups \
    --filters Name=group-name,Values=POD_SG Name=vpc-id,Values=${VPC_ID} \
    --query "SecurityGroups[0].GroupId" --output text)

echo "POD security group ID: ${POD_SG}"


# Allow POD_SG to connect to the RDS
aws ec2 authorize-security-group-ingress \
    --group-id ${RDS_SG} \
    --protocol tcp \
    --port 5432 \
    --source-group ${POD_SG}
```

Get access to RDS from C9

```
# Cloud9 IP
export C9_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# allow Cloud9 to connect to RDS
aws ec2 authorize-security-group-ingress \
    --group-id ${RDS_SG} \
    --protocol tcp \
    --port 5432 \
    --cidr ${C9_IP}/32
```

## Create the RDS database

```
export PUBLIC_SUBNETS_ID=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=cdkVpc/Vpc/PublicSubnet*" \
    --query 'Subnets[*].SubnetId' \
    --output json | jq -c .)

# create a db subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name rds-eksworkshop \
    --db-subnet-group-description rds-eksworkshop \
    --subnet-ids ${PUBLIC_SUBNETS_ID}
```

```
mkdir ~/environment/sg-per-pod

# get RDS SG ID
export RDS_SG=$(aws ec2 describe-security-groups \
    --filters Name=group-name,Values=RDS_SG Name=vpc-id,Values=${VPC_ID} \
    --query "SecurityGroups[0].GroupId" --output text)

# generate a password for RDS
export RDS_PASSWORD="$(date | md5sum  |cut -f1 -d' ')"
echo ${RDS_PASSWORD}  > ~/environment/sg-per-pod/rds_password


# create RDS Postgresql instance
aws rds create-db-instance \
    --db-instance-identifier rds-casskop \
    --db-name CassKop \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --db-subnet-group-name rds-eksworkshop \
    --vpc-security-group-ids $RDS_SG \
    --master-username casskop \
    --publicly-accessible \
    --master-user-password ${RDS_PASSWORD} \
    --backup-retention-period 0 \
    --allocated-storage 20
```

It will take 4mn to create the database, you can check with

```
aws rds describe-db-instances \
    --db-instance-identifier rds-casskop \
    --query "DBInstances[].DBInstanceStatus" \
    --output text
```

Once available, let's get the RDS endpoint

```
# get RDS endpoint
export RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier rds-casskop \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

echo "RDS endpoint: ${RDS_ENDPOINT}"
```

```
sudo yum install -y postgresql # or sudo apt-get install postgresql

cd ~/environment/sg-per-pod

cat << EoF > ~/environment/sg-per-pod/pgsql.sql
CREATE TABLE welcome (column1 TEXT);
insert into welcome values ('--------------------------');
insert into welcome values ('Welcome to the eksworkshop');
insert into welcome values ('--------------------------');
EoF

export RDS_PASSWORD=$(cat ~/environment/sg-per-pod/rds_password)

psql postgresql://casskop:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/CassKop \
    -f ~/environment/sg-per-pod/pgsql.sql
```

## CNI Configuration

We need a mutating webhook and a resource controller to manage ENI trunckong and SG attribution.

Add this policy to cluster Role:

```
ROLE_NAME=StatefulCluster-StatefulClusterRole812D5B55-7RUDMOBACKNP
aws iam attach-role-policy \
    --policy-arn arn:aws:iam::aws:policy/AmazonEKSVPCResourceController \
    --role-name ${ROLE_NAME}
```

Enable Pod ENI:

```
kubectl -n kube-system set env daemonset aws-node ENABLE_POD_ENI=true

# let's way for the rolling update of the daemonset
kubectl -n kube-system rollout status ds aws-node
```

Chgeck with

```
kubectl get nodes -o wide -L vpc.amazonaws.com/has-trunk-attached
```

> Has-trunck)attached should be true for this feature to work

## The pod needs to communicate with DNS resolution on NodeGRoup

We will add the cluster Security Group to our pod also

```
CLUSTER_NAME=CassKop
CLUSTER_SG=$(aws eks describe-cluster --name $CLUSTER_NAME --query "cluster.resourcesVpcConfig.clusterSecurityGroupId" --output text)
echo $CLUSTER_SG
```

Now let's create the policy

```
cat << EoF > ~/environment/sg-per-pod/sg-policy.yaml
apiVersion: vpcresources.k8s.aws/v1beta1
kind: SecurityGroupPolicy
metadata:
  name: allow-rds-access
spec:
  podSelector:
    matchLabels:
      app: green-pod
  securityGroups:
    groupIds:
      - ${POD_SG}
      - ${CLUSTER_SG}
EoF
```

create example

```
kubectl create namespace sg-per-pod

kubectl -n sg-per-pod apply -f sg-policy.yaml
kubectl -n sg-per-pod describe securitygrouppolicy
```

Kubernetes Secret for RDS Access

```
export RDS_PASSWORD=$(cat ~/environment/sg-per-pod/rds_password)

export RDS_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier rds-casskop \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

kubectl create secret generic rds\
    --namespace=sg-per-pod \
    --from-literal="password=${RDS_PASSWORD}" \
    --from-literal="host=${RDS_ENDPOINT}"

kubectl -n sg-per-pod describe  secret rds
```

Deployment

```
cd ~/environment/sg-per-pod

curl -s -O https://www.eksworkshop.com/beginner/115_sg-per-pod/deployments.files/green-pod.yaml
curl -s -O https://www.eksworkshop.com/beginner/115_sg-per-pod/deployments.files/red-pod.yaml
```

```
kubectl -n sg-per-pod apply -f ~/environment/sg-per-pod/green-pod.yaml

kubectl -n sg-per-pod rollout status deployment green-pod
```

when describing the pod, we can see that for the green pod, we have the vpc-resource-controller allocated an ENI for the pod and attached appropriate Security Groups to it
