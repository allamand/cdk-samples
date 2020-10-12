import { Construct } from '@aws-cdk/core';
import { Cluster, Nodegroup } from '@aws-cdk/aws-eks';

import { K8sResourceIRSA } from './K8sResource';
import { loadManifestYaml, loadManifestYamlAllWithoutServiceAcount, loadManifestYamlWithoutServiceAcount } from '../utils/manifest_reader';
import { createPolicy, json2statements } from '../policies/PolicyUtils';
import { PropagatedTagSource } from '@aws-cdk/aws-ecs';

/*
** Set-up cloudwatch-agent to gather EKS cluster metrics and shows them in Cloudwatch Container Insights
**
** By default metrics will be stored in a log group name : 	/aws/containerinsights/<cluster_name>/performance
**
*/
export class CloudWatchAgent extends K8sResourceIRSA {
    constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any }) {
        props.name = 'cloudwatch-agent';
        props.namespace = 'amazon-cloudwatch';
        props.iamPolicyFile = 'cloudwatch-agent.json'
        super(scope, id, cluster, props);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, class-methods-use-this
    protected manifests(): any[] { // eslint-disable-line @typescript-eslint/no-explicit-any
        const manifests = loadManifestYamlAllWithoutServiceAcount('kubernetes-manifests/amazon-cloudwatch-container-insights');

        const cm = manifests.find((manifest) => manifest.kind === 'ConfigMap');

        cm.data["cwagentconfig.json"] = cm.data["cwagentconfig.json"].replace('{{cluster_name}}', this.cluster.clusterName);

        return manifests;

    }
}
