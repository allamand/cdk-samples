
# deploy the bastion host

```bash
cdk diff BastionHost -c enable_stack=BastionHost -c HOME_IP=$(curl -s myip.today)    
cdk deploy BastionHost -c enable_stack=BastionHost -c HOME_IP=$(curl -s myip.today) 
```

# copy the local public key to the bastion server

```bash
aws ec2-instance-connect send-ssh-public-key --instance-id i-0bdf7cab8d0f30016 \
--instance-os-user ec2-user --ssh-public-key file://$HOME/.ssh/aws_2020_id_rsa.pub \
--availability-zone ap-northeast-1a
```

# sshcode to launch the remote VSCode

```bash
sshcode ec2-user@{IP_ADDRESS}
```

# prepare development environment

In the remote VSCode, open the built-in terminal and install required packages:

```bash
# install git
sudo yum install -y git
# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
# reload the shell
exec $SHELL
# install node LTS
nvm install --lts
# install yarn
npm install -g yarn

```
