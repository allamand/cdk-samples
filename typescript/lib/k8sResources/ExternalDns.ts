import { Construct } from "@aws-cdk/core";
import { Cluster, Nodegroup } from "@aws-cdk/aws-eks";

import { IrsaProps, K8sManifest, K8sManifestIRSA } from "./K8sResource";
import { loadManifestYaml } from "../utils/manifest_reader";
import { createPolicy, json2statements } from "../policies/PolicyUtils";

//aws route53 list-hosted-zones | jq '.HostedZones[]| select(.Name == "demo3.allamand.com.")'

export class ExternalDns extends K8sManifestIRSA {
  private readonly domain: string;

  constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any } = {}) {
    const irsa: IrsaProps = {
      name: "external-dns",
      iamPolicyFile: "external-dns.json",
      namespace: "kube-system",
    };
    props.irsa = irsa;
    super(scope, id, cluster, props);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, class-methods-use-this
  protected manifests(props: { domain: string; owner: string; policy: string }): any[] {
    const externalDnsManifests = loadManifestYaml("kubernetes-manifests/exterrnal-dns/external-dns.yaml");

    // eslint-disable-next-line arrow-body-style
    const externalDnsDeployment = externalDnsManifests.find((manifest) => {
      return manifest.kind === "Deployment" && manifest.metadata.name === "external-dns";
    });
    const container = externalDnsDeployment.spec.template.spec.containers[0];
    container.args = container.args.map((arg: string) => {
      if (arg.startsWith("--domain-filter=")) {
        return `--domain-filter=${props.domain}`;
      }
      if (arg.startsWith("--txt-owner-id=") && props.policy != "") {
        return `--txt-owner-id=${props.owner}`;
      }
      if (arg.startsWith("--policy=") && props.policy == "sync") {
        return `--policy=${props.policy}`;
      }

      return arg;
    });
    return externalDnsManifests;
  }
}
