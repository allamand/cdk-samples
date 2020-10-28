

all: deploy

dependences:
	yarn

build: dependences
	yarn build

ENVFILE?=.env

#For targets diff and deploy we launch .env file
ifeq ($(filter $(firstword $(MAKECMDGOALS)),diff deploy env synth),$(firstword $(MAKECMDGOALS)))
include $(ENVFILE)
VARS:=$(shell sed -ne 's/ *\#.*$$//; /./ s/=.*$$// p' $(ENVFILE) )
$(foreach v,$(VARS),$(eval $(shell echo export $(v)="$($(v))")))
endif

env:
	echo $(ENVFILE)
	echo $(cluster_name)

deploy-vpc:
	cdk deploy cdkVpc -c enable_stack=cdkVpc
	
diff: build
	 cdk diff $(STACK) -c enable_stack=$(STACK)

synth: build
	 time cdk synth $(STACK)  --require-approval=never -c enable_stack=$(STACK)

deploy: build
	 time cdk deploy $(STACK)  --require-approval=never -c enable_stack=$(STACK)

destroy:
	 time cdk destroy $(STACK) -c enable_stack=$(STACK) 

context:
	 time cdk context -j $(STACK) -c enable_stack=$(STACK) 


#For test and test-update we include .env.template instead
ifeq ($(filter $(firstword $(MAKECMDGOALS)),test test-update),$(firstword $(MAKECMDGOALS)))

#Include env Var for the tests
include .env.template
VARS:=$(shell sed -ne 's/ *\#.*$$//; /./ s/=.*$$// p' .env.template )
$(foreach v,$(VARS),$(eval $(shell echo export $(v)="$($(v))")))
endif

.PHONY: test

test: build
#	export CDK_DEFAULT_ACCOUNT=$(shell aws sts get-caller-identity --output text --query 'Account') ; 
#	export CDK_DEFAULT_REGION=$(shell  aws configure get region) ; 
	echo $(use_vpc_id)
	echo $(TOTO)
	exit;
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




#---


ifeq ($(filter $(firstword $(MAKECMDGOALS)),diff2 deploy2),$(firstword $(MAKECMDGOALS)))
include .env.2
VARS:=$(shell sed -ne 's/ *\#.*$$//; /./ s/=.*$$// p' .env.2 )
$(foreach v,$(VARS),$(eval $(shell echo export $(v)="$($(v))")))
endif
diff2: build
	 cdk diff $(STACK) -c enable_stack=$(STACK)

deploy2: build
	 time cdk deploy $(STACK)  --require-approval=never -c enable_stack=$(STACK)

