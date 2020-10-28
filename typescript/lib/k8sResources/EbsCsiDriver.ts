import { Construct } from '@aws-cdk/core';
import { Cluster, Nodegroup } from '@aws-cdk/aws-eks';

import { IrsaProps, K8sManifest, K8sManifestIRSA } from './K8sResource';
import { loadManifestYaml, loadManifestYamlWithoutServiceAcount } from '../utils/manifest_reader';
import { createPolicy, json2statements } from '../policies/PolicyUtils';

export class EbsCsiDriver extends K8sManifestIRSA {
  constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any }) {
    const irsa: IrsaProps = {
      name: 'ebs-csi-controller',
      iamPolicyFile: 'ebs-csi-driver.json',
      namespace: 'kube-system'
    }
    props.irsa = irsa;
    super(scope, id, cluster, props);

    //const policy = createPolicy(this, 'AmazonEBSCSIDriver', 'ebs-csi-driver.json');
    //nodeGroup.role.attachInlinePolicy(policy);
    /*
        const policyStatements = json2statements('ebs-csi-driver.json')
        const namespace = 'kube-system';
        const sa = cluster.addServiceAccount('sa-ebs-csi-controller-sa', {
          name: 'ebs-csi-controller-sa',
          namespace: namespace,
        })
        policyStatements.forEach(function (statement) {
          sa.addToPolicy(statement)
        });
        */
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, class-methods-use-this
  protected manifests(): any[] { // eslint-disable-line @typescript-eslint/no-explicit-any
    return loadManifestYamlWithoutServiceAcount('kubernetes-manifests/ebs-csi-driver/ebs-csi-driver.yaml');
  }
}
