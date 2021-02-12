# Add Secondary IP to CassKop EKS cluster

## Configure New CIDR subnets in VPC

Retrieve VPC IC and associate a new CIDR block:
```bash
VPC_ID=$(aws ec2 describe-vpcs --filters Name=tag:Name,Values=cdkVpc/Vpc | jq -r '.Vpcs[].VpcId')
echo $VPC_ID
aws ec2 associate-vpc-cidr-block --vpc-id $VPC_ID --cidr-block 100.64.0.0/16
```

Describe instances of CassKop cluster:
```bash
aws ec2 describe-instances --filters "Name=tag-key,Values=eks:cluster-name" "Name=tag-value,Values=CassKop" --query 'Reservations[*].Instances[*].[PrivateDnsName,Tags[?Key==`eks:nodegroup-name`].Value|[0],Placement.AvailabilityZone,PrivateIpAddress,PublicIpAddress]' --output table   
```

Create new subnets for each AZs fro new CIDR:
```bash
export AZ1=eu-west-1a
export AZ2=eu-west-1b
export AZ3=eu-west-1c
CGNAT_SNET1=$(aws ec2 create-subnet --cidr-block 100.64.0.0/19 --vpc-id $VPC_ID --availability-zone $AZ1 | jq -r .Subnet.SubnetId)
CGNAT_SNET2=$(aws ec2 create-subnet --cidr-block 100.64.32.0/19 --vpc-id $VPC_ID --availability-zone $AZ2 | jq -r .Subnet.SubnetId)
CGNAT_SNET3=$(aws ec2 create-subnet --cidr-block 100.64.64.0/19 --vpc-id $VPC_ID --availability-zone $AZ3 | jq -r .Subnet.SubnetId)
echo $CGNAT_SNET1
echo $CGNAT_SNET2
echo $CGNAT_SNET3
```

Show existing Tags from primary subnets:
```bash
aws ec2 describe-subnets --filters Name=cidr-block,Values=10.0.0.0/20 --output text
```

Create Tags for new Subnets:
```bash
aws ec2 create-tags --resources $CGNAT_SNET1 --tags Key=kubernetes.io/cluster/CassKop,Value=shared
aws ec2 create-tags --resources $CGNAT_SNET1 --tags Key=kubernetes.io/role/elb,Value=1

aws ec2 create-tags --resources $CGNAT_SNET2 --tags Key=kubernetes.io/cluster/CassKop,Value=shared
aws ec2 create-tags --resources $CGNAT_SNET2 --tags Key=kubernetes.io/role/elb,Value=1

aws ec2 create-tags --resources $CGNAT_SNET3 --tags Key=kubernetes.io/cluster/CassKop,Value=shared
aws ec2 create-tags --resources $CGNAT_SNET3 --tags Key=kubernetes.io/role/elb,Value=1
```

Get Route Tables ID from first primary subnet
```bash
SNET1=$(aws ec2 describe-subnets --filters Name=cidr-block,Values=10.0.0.0/20 | jq -r '.Subnets[].SubnetId' | tail -1) 
echo $SNET1
RTASSOC_ID=$(aws ec2 describe-route-tables --filters Name=association.subnet-id,Values=$SNET1 | jq -r '.RouteTables[].RouteTableId')
echo $RTASSOC_ID
```

Create new routes in the routetable for new subnets
```bash
aws ec2 associate-route-table --route-table-id $RTASSOC_ID --subnet-id $CGNAT_SNET1
aws ec2 associate-route-table --route-table-id $RTASSOC_ID --subnet-id $CGNAT_SNET2
aws ec2 associate-route-table --route-table-id $RTASSOC_ID --subnet-id $CGNAT_SNET3
```

## Configure VPC CNI Plugin

Check CNI version (must be > 1.7)
```bash
kubectl describe daemonset aws-node --namespace kube-system | grep Image | cut -d "/" -f 2
```
>update to 1.7 if needed
> ```bash
> kubectl apply -f https://raw.githubusercontent.com/aws/amazon-vpc-cni-k8s/release-1.7/config/v1.7/aws-k8s-cni.yaml
> ```

Configure Custom network on VPC-CNI
```bash
kubectl set env ds aws-node -n kube-system AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG=true
kubectl describe daemonset aws-node -n kube-system | grep -A5 Environment
```

Reboot Instances so they have new network configuration
> Warning: This will reboot all Instances of CassKop cluster!!
```bash
INSTANCE_IDS=(`aws ec2 describe-instances --query 'Reservations[*].Instances[*].InstanceId' --filters "Name=tag-key,Values=eks:cluster-name" "Name=tag-value,Values=CassKop" --output text` )
for i in "${INSTANCE_IDS[@]}"
do
	echo "Terminating EC2 instance $i ..."
	aws ec2 terminate-instances --instance-ids $i
done
```

## Create ENIConfig 

Get Subnet IDs:
```bash
aws ec2 describe-subnets  --filters "Name=cidr-block,Values=100.64.*" --query 'Subnets[*].[CidrBlock,SubnetId,AvailabilityZone]' --output table
--------------------------------------------------------------
|                       DescribeSubnets                      |
+-----------------+----------------------------+-------------+
|  100.64.32.0/19 |  subnet-0000bac7fbbb5945e  |  eu-west-1b |
|  100.64.0.0/19  |  subnet-0f4dfbdb9309a4f97  |  eu-west-1a |
|  100.64.64.0/19 |  subnet-05913f0f325faf416  |  eu-west-1c |
+-----------------+----------------------------+-------------+
```

Get Instance Security Groups:
```bash
INSTANCE_IDS=(`aws ec2 describe-instances --query 'Reservations[*].Instances[*].InstanceId' --filters "Name=tag-key,Values=eks:cluster-name" "Name=tag-value,Values=CassKop" --output text`)
for i in "${INSTANCE_IDS[@]}"
do
  echo "SecurityGroup for EC2 instance $i ..."
  aws ec2 describe-instances --instance-ids $i | jq -r '.Reservations[].Instances[].SecurityGroups[].GroupId'
done  
```

Get AZ of instances
```bash
aws ec2 describe-instances --filters "Name=tag-key,Values=eks:cluster-name" "Name=tag-value,Values=CassKop" --query 'Reservations[*].Instances[*].[PrivateDnsName,Tags[?Key==`eks:nodegroup-name`].Value|[0],Placement.AvailabilityZone,PrivateIpAddress,PublicIpAddress]' --output table  

|  ip-10-0-48-92.eu-west-1.compute.internal  |  StatefulClusterNodegroupnod-r4dvDSN90pmU  |  eu-west-1a |  10.0.48.92  |  None |
|  ip-10-0-78-11.eu-west-1.compute.internal  |  StatefulClusterNodegroupnod-iQ6caTRh2WFA  |  eu-west-1b |  10.0.78.11  |  None |
|  ip-10-0-83-246.eu-west-1.compute.internal |  StatefulClusterNodegroupnod-kPDmp7k7cUQa  |  eu-west-1c |  10.0.83.246 |  None |
```

Annotate each node with the proper eniConfig name
```bash
kubectl annotate node ip-10-0-48-92.eu-west-1.compute.internal k8s.amazonaws.com/eniConfig=eu-west-1a --overwrite
kubectl annotate node ip-10-0-78-11.eu-west-1.compute.internal k8s.amazonaws.com/eniConfig=eu-west-1b --overwrite
kubectl annotate node ip-10-0-83-246.eu-west-1.compute.internal  k8s.amazonaws.com/eniConfig=eu-west-1c --overwrite
```

Use zone topology on VPC cni
```bash
kubectl set env daemonset aws-node -n kube-system ENI_CONFIG_LABEL_DEF=topology.kubernetes.io/zone
```

> Some error with Rate limiting on ECR
pod/2048-7d86c6f6bf-6l8xk    Failed to pull image "public.ecr.aws/u0b4h6b4/docker-2048": rpc error: code = Unknown desc = Error response from daemon: toomanyrequests: Rate exceeded


8ENI 30 IP
8x(30-8) = 176
8ENI * (30-1)@ +2 = 234 @IP disponibles
(8x30)-8 = 232
(8-1)x(30-1)+2=205

k describe node ip-10-0-83-246.eu-west-1.compute.internal | grep -i pods
  pods:                        234
  pods:                        234
Non-terminated Pods:          (207 in total)


| - | - | - | - |
| Instance type |	Maximum network interfaces |	Private IPv4 addresses per interface |	IPv6 addresses per interface |
| c5d.4xlarge 	| 8 | 30 | 30 |