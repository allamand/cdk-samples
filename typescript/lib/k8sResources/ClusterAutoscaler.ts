import { Construct } from '@aws-cdk/core';
import { Cluster, Nodegroup } from '@aws-cdk/aws-eks';

import {IrsaProps, K8sManifestIRSA} from './K8sResource';
import {loadManifestYaml, loadManifestYamlWithoutServiceAcount} from '../utils/manifest_reader';
import {createPolicy, json2statements} from '../policies/PolicyUtils';

export class ClusterAutoscaler extends K8sManifestIRSA {
  constructor(scope: Construct, id: string, cluster: Cluster, props: {[key: string]: any}) {
    const irsa: IrsaProps = {
      name: 'cluster-autoscaler',
      iamPolicyFile: 'cluster-autoscaler.json',
      namespace: 'kube-system'
    }
    props.irsa = irsa;
    super(scope, id, cluster, props);
  }

  protected manifests(): any[] { // eslint-disable-line @typescript-eslint/no-explicit-any
    const manifests = loadManifestYamlWithoutServiceAcount('kubernetes-manifests/cluster-autoscaler/cluster-autoscaler-autodiscover.yaml');
    const deployment = manifests.find((manifest) => manifest.kind === 'Deployment');
    const { command } = deployment.spec.template.spec.containers[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const index = command.findIndex((cmd: any) => /<YOUR CLUSTER NAME>/.test(cmd));
    command[index] = command[index].replace('<YOUR CLUSTER NAME>', this.cluster.clusterName);
    command.push('--balance-similar-node-groups');
    command.push('--skip-nodes-with-system-pods=false');
    return manifests;
  }
}
