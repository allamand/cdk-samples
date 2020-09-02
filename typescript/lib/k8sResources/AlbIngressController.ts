import {Aspects, Construct, Tag} from '@aws-cdk/core';
import { Cluster } from '@aws-cdk/aws-eks';
import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');

import { K8sResource } from './K8sResource';
import { createPolicy } from '../policies/PolicyUtils';
import { loadManifestYaml } from '../utils/manifest_reader';

export class AlbIngressController extends K8sResource {
    constructor(scope: Construct, id: string, cluster: Cluster) {
        super(scope, id, cluster);

        this.cluster.vpc.publicSubnets.forEach((subnet) => {
            //subnet.node.(new Tag('kubernetes.io/role/elb', '1', { includeResourceTypes: ['AWS::EC2::Subnet'] }));
            Aspects.of(subnet).add(new Tag('kubernetes.io/role/elb', '1', { includeResourceTypes: ['AWS::EC2::Subnet'] }))
        });
        this.cluster.vpc.privateSubnets.forEach((subnet) => {
            //subnet.node.applyAspect(new Tag('kubernetes.io/role/internal-elb', '1', { includeResourceTypes: ['AWS::EC2::Subnet'] }));
            Aspects.of(subnet).add(new Tag('kubernetes.io/role/internal-elb', '1', { includeResourceTypes: ['AWS::EC2::Subnet'] }))
        });

        /*
        const policy = createPolicy(this, 'ALBIngressControllerIAM', 'alb-ingress-controller.json');
        this.cluster.role.attachInlinePolicy(policy);

         */
    }

    protected manifests(): any[] { // eslint-disable-line @typescript-eslint/no-explicit-any

        /**
         * dynamic add required policies for the service account
         *
         * credit to t.me/zxkane
         */

        const albIngressControllerVersion = 'v1.1.8';
        const albNamespace = 'kube-system';
        const albBaseResourceBaseUrl = `https://raw.githubusercontent.com/kubernetes-sigs/aws-alb-ingress-controller/${albIngressControllerVersion}/docs/examples/`;
        const albIngressControllerPolicyUrl = `${albBaseResourceBaseUrl}iam-policy.json`;

        const sa = this.cluster.addServiceAccount('sa-alb-ingress', {
            name: 'alb-ingress-controller',
            namespace: albNamespace,
        })

        const request = require('sync-request');
        const policyJson = request('GET', albIngressControllerPolicyUrl).getBody();
        ((JSON.parse(policyJson))['Statement'] as []).forEach((statement, idx, array) => {
            sa.addToPolicy(iam.PolicyStatement.fromJson(statement));
        });

        const yaml = require('js-yaml');
        const rbacRoles = yaml.safeLoadAll(request('GET', `${albBaseResourceBaseUrl}rbac-role.yaml`).getBody())
            .filter((rbac: any) => {
                return rbac['kind'] != 'ServiceAccount'
            });
        const albDeployment = yaml.safeLoad(request('GET', `${albBaseResourceBaseUrl}alb-ingress-controller.yaml`).getBody());



        //We don't create it here, we just need to send back the manifests
        //const albResources = cluster.addResource('aws-alb-ingress-controller', ...rbacRoles, albDeployment);
        try {
            const { args } = albDeployment.spec.template.spec.containers[0];
            args.push(`--cluster-name=${this.cluster.clusterName}`);
            args.push(`--feature-gates=wafv2=false`);
            args.push(`--aws-vpc-id=${this.cluster.vpc.vpcId}`);
            args.push(`--aws-region=${this.cluster.stack.region}`);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error({ error });
            process.exit(1);
        }

        return [...rbacRoles, albDeployment];
    }


}



