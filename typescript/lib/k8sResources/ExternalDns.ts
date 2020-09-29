import { Construct } from '@aws-cdk/core';
import { Cluster, Nodegroup } from '@aws-cdk/aws-eks';

import { K8sResource } from './K8sResource';
import { loadManifestYaml } from '../utils/manifest_reader';
import { createPolicy, json2statements } from '../policies/PolicyUtils';

//aws route53 list-hosted-zones | jq '.HostedZones[]| select(.Name == "demo3.allamand.com.")'

export class ExternalDns extends K8sResource {
  private readonly domain: string;

  constructor(
    scope: Construct,
    id: string,
    cluster: Cluster,
    props: {
      domain: string,
      policy: string,
      owner: string,
    },
  ) {
    super(scope, id, cluster, props);

    //const policy = createPolicy(this, 'ExternalDNS', 'external-dns.json');
    const policyStatements = json2statements('external-dns.json')
    //nodeGroup.role.attachInlinePolicy(policy); // we prefere IRSA than node Role
    const namespace = 'kube-system';
    const sa = cluster.addServiceAccount('sa-external-dns', {
      name: 'external-dns',
      namespace: namespace,
    })
    policyStatements.forEach(function (statement) {
      sa.addToPolicy(statement)
    });
    
    
    
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, class-methods-use-this
  protected manifests(props: { domain: string, owner: string, policy: string }): any[] {
    const externalDnsManifests = loadManifestYaml('kubernetes-manifests/exterrnal-dns/external-dns.yaml');

    // eslint-disable-next-line arrow-body-style
    const externalDnsDeployment = externalDnsManifests.find((manifest) => {
      return manifest.kind === 'Deployment' && manifest.metadata.name === 'external-dns';
    });
    const container = externalDnsDeployment.spec.template.spec.containers[0];
    container.args = container.args.map((arg: string) => {
      if (arg.startsWith('--domain-filter=')) {
        return `--domain-filter=${props.domain}`;
      }
      if (arg.startsWith('--txt-owner-id=') && props.policy != "") {
        return `--txt-owner-id=${props.owner}`;
      }
      if (arg.startsWith('--policy=') && props.policy == "sync") {
        return `--policy=${props.policy}`;
      }

      return arg;
    });
    return externalDnsManifests;
  }
}
