import { Construct } from '@aws-cdk/core';
import { Cluster, Nodegroup } from '@aws-cdk/aws-eks';

import {K8sResource, K8sResourceIRSA} from './K8sResource';
import {loadManifestYaml, loadManifestYamlWithoutServiceAcount} from '../utils/manifest_reader';
import {createPolicy, json2statements} from '../policies/PolicyUtils';
import * as YAML from "js-yaml";

export class EksUtilsAdmin extends K8sResourceIRSA {
    constructor(scope: Construct, id: string, cluster: Cluster, props: {[key: string]: any}) {
        props.name = 'eksutils-admin';
        props.iamPolicyFile = 'eksutils-admin.json';
        super(scope, id, cluster, props);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, class-methods-use-this
    protected manifests(props?: { [key: string]: any }): any[] { // eslint-disable-line @typescript-eslint/no-explicit-any

        const manifests = loadManifestYamlWithoutServiceAcount('kubernetes-manifests/eksutils/eksutils-deployment.yaml');
        const ClusterRoleBinding = manifests.find((manifest) => manifest.kind === 'ClusterRoleBinding');
        //const { command } =
        if (props){
            ClusterRoleBinding.subjects[0].namespace = props["namespace"];
            ClusterRoleBinding.metadata.name = 'eksutils-admin-'+props.namespace

        }

        const dep = manifests.find((manifest) => manifest.kind == 'Deployment')
        if (props){
            dep.metadata.namespace = props["namespace"];
        }
        return manifests;
    }
}


