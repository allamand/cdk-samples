import { Construct } from '@aws-cdk/core';
import { Cluster, Nodegroup } from '@aws-cdk/aws-eks';

import { K8sResource, K8sResourceIRSA } from './K8sResource';
import { loadManifestYaml, loadManifestYamlWithoutServiceAcount } from '../utils/manifest_reader';
import { createPolicy, json2statements } from '../policies/PolicyUtils';
import * as YAML from "js-yaml";

export class EksUtilsAdmin extends K8sResourceIRSA {
    constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any }) {
        props.name = 'eksutils-admin';
        props.iamPolicyFile = 'eksutils-admin.json';
        /*
        if (props.schedulerName == "fargate") {
            props.iamPolicyFile = 'eksutils-admin-fargate.json';
        }
*/
        super(scope, id, cluster, props);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, class-methods-use-this
    protected manifests(props?: { [key: string]: any }): any[] { // eslint-disable-line @typescript-eslint/no-explicit-any

        let manifests = loadManifestYamlWithoutServiceAcount('kubernetes-manifests/eksutils/eksutils-deployment.yaml');

        if (props && props.schedulerName == "fargate") {
            manifests = loadManifestYamlWithoutServiceAcount('kubernetes-manifests/eksutils/eksutils-deployment-fargate.yaml'); // /home/ubuntu/environment/eks/cdk/cdk-samples/typescript/kubernetes-manifests/eksutils/eksutils-deployment-fargate.yaml
        }

        const ClusterRoleBinding = manifests.find((manifest) => manifest.kind === 'ClusterRoleBinding');
        //const { command } =
        if (props) {
            ClusterRoleBinding.subjects[0].namespace = props["namespace"];
            ClusterRoleBinding.metadata.name = 'eksutils-admin-' + props.namespace

        }

        const dep = manifests.find((manifest) => manifest.kind == 'Deployment')
        if (props) {
            dep.metadata.namespace = props["namespace"];
        }

        const cm = manifests.find((manifest) => manifest.kind == 'ConfigMap')
        const elasticsearchDomain = this.node.tryGetContext('elasticsearch_host') || process.env.elasticsearch_host
        if (cm) {
            cm.data["fluent-bit.conf"] = cm.data["fluent-bit.conf"].replace('{{elasticsearch_host}}', elasticsearchDomain);
        }
        return manifests;
    }
}


