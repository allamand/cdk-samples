

all: deploy

dependences:
	yarn

build: dependences
	yarn build


ifdef VPC_ID
 PARAM_VPC_ID := -c use_vpc_id=$(VPC_ID)
endif

ifdef DOMAIN
 PARAM_DOMAIN := -c app_domain=$(DOMAIN)
endif

ifdef NAME
 PARAM_NAME := -c cluster_name=$(NAME)
endif

ifdef HOME_IP
 PARAM_HOME_IP := -c HOME_IP=$(HOME_IP)
endif

diff: build
	 time cdk diff AlbIngressControllerStack -c enable_stack=$(STACK) \
       $(PARAM_VPC_ID) \
	   $(PARAM_DOMAIN) \
   	   $(PARAM_NAME) \
	   $(PARAM_HOME_IP)

# make deploy STACK=AlbIngressControllerStack DOMAIN=my.domain.com VPC_ID=vpc-xxxxx
# make deploy STACK=BastionHost VPC_ID=vpc-xxxxxxx HOME_IP=12.12.12.12
deploy: build
	 time cdk deploy $(STACK)  --require-approval=never -c enable_stack=$(STACK) \
       $(PARAM_VPC_ID) \
	   $(PARAM_DOMAIN) \
	   $(PARAM_NAME) \
	   $(PARAM_HOME_IP)

# make destroy DOMAIN=my.domain.com STACK=AlbIngressControllerStack VPC_ID=vpc-xxxxxx
destroy:
	 time cdk destroy $(STACK) -c enable_stack=$(STACK) \
	   $(PARAM_VPC_ID) \
       $(PARAM_DOMAIN) \
	   $(PARAM_NAME) \
       $(PARAM_HOME_IP)

context:
	 time cdk context -j $(STACK) -c enable_stack=$(STACK) \
	   $(PARAM_VPC_ID) \
       $(PARAM_DOMAIN) \
	   $(PARAM_NAME) \
       $(PARAM_HOME_IP)

test: build
	export CDK_DEFAULT_ACCOUNT=$(shell aws sts get-caller-identity --output text --query 'Account') ; \
	export CDK_DEFAULT_REGION=$(shell  aws configure get region) ; \
	npm test

#same but update test snapshot
test-update: build
	export CDK_DEFAULT_ACCOUNT=$(shell aws sts get-caller-identity --output text --query 'Account') ; \
	export CDK_DEFAULT_REGION=$(shell  aws configure get region) ; \
	npm test -- -u

deploy-param:
	cdk deploy EksMini -c enable_stack=EksMini -c use_default_vpc=1

deploy-vpc:
	cdk deploy cdkVpc -c enable_stack=cdkVpc
