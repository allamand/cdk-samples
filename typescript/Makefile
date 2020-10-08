

all: deploy

dependences:
	yarn

build: dependences
	yarn build

include .env

VARS:=$(shell sed -ne 's/ *\#.*$$//; /./ s/=.*$$// p' .env )
$(foreach v,$(VARS),$(eval $(shell echo export $(v)="$($(v))")))

diff: build
	 cdk diff $(STACK) -c enable_stack=$(STACK)

# make deploy STACK=AlbIngressControllerStack DOMAIN=my.domain.com VPC_ID=vpc-xxxxx
# make deploy STACK=BastionHost VPC_ID=vpc-xxxxxxx HOME_IP=12.12.12.12
deploy: build
	 time cdk deploy $(STACK)  --require-approval=never -c enable_stack=$(STACK)

# make destroy DOMAIN=my.domain.com STACK=AlbIngressControllerStack VPC_ID=vpc-xxxxxx
destroy:
	 time cdk destroy $(STACK) -c enable_stack=$(STACK) 

context:
	 time cdk context -j $(STACK) -c enable_stack=$(STACK) 

test: build
#	export CDK_DEFAULT_ACCOUNT=$(shell aws sts get-caller-identity --output text --query 'Account') ; 
#	export CDK_DEFAULT_REGION=$(shell  aws configure get region) ; 
	export CDK_DEFAULT_ACCOUNT=xxxxxxxxxxxx ; \
	export CDK_DEFAULT_REGION=eu-west-1 ; \
	npm test

#same but update test snapshot
test-update: build
#	export CDK_DEFAULT_ACCOUNT=$(shell aws sts get-caller-identity --output text --query 'Account') ; 
#	export CDK_DEFAULT_REGION=$(shell  aws configure get region) ; 
	export CDK_DEFAULT_ACCOUNT=xxxxxxxxxxxx ; \
	export CDK_DEFAULT_REGION=eu-west-1 ; \
	npm test -- -u

deploy-vpc:
	cdk deploy cdkVpc -c enable_stack=cdkVpc
