import { Construct } from '@aws-cdk/core';
import { Cluster, HelmChart, HelmChartOptions, HelmChartProps, KubernetesManifest } from '@aws-cdk/aws-eks';
import { ServiceAccount } from "@aws-cdk/aws-eks/lib/service-account";
import { json2statements } from "../policies/PolicyUtils";
import { PolicyStatement } from '@aws-cdk/aws-iam';

export abstract class K8sResource extends Construct {
  protected readonly cluster: Cluster;
  protected sa: ServiceAccount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any } = {}) {
    super(scope, id);
    this.cluster = cluster;
    //Retrieved Kubernetes manifests
    const manifest = this.manifests(props);
    const resource = new KubernetesManifest(this, 'K8sResource', {
      cluster: this.cluster,
      manifest,
    });
    resource.node.addDependency(this.cluster)
    if (this.sa) {
      resource.node.addDependency(this.sa)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, class-methods-use-this
  protected abstract manifests(props?: { [key: string]: any }): any[];
}

export abstract class K8sResourceIRSA extends Construct {
  protected readonly cluster: Cluster;
  protected sa: ServiceAccount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any } = {}) {
    super(scope, id);

    this.cluster = cluster;

    //Compute ServiceAccount with IAM role
    const ns = cluster.addManifest('namespace' + id, {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: props.namespace }
    });
    const policyStatements = json2statements(props.iamPolicyFile)
    this.sa = cluster.addServiceAccount("service-account" + id, {
      name: props.name,
      namespace: props.namespace
    })
    const sa = this.sa
    policyStatements.forEach(function (statement) {
      sa.addToPolicy(statement)
    });
    this.sa.node.addDependency(ns)

    //Retrieved Kubernetes manifests
    const manifest = this.manifests(props);


    const resource = new KubernetesManifest(this, 'K8sResourceIRSA', {
      cluster: this.cluster,
      manifest,
    });
    //should be equivalent, https://docs.aws.amazon.com/cdk/api/latest/docs/aws-eks-readme.html#kubernetes-resources
    //.. but it's not here..
    //this.cluster.addResource('K8sResourceIRSA', manifest);

    if (this.sa) {
      resource.node.addDependency(this.sa)
    }

  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, class-methods-use-this
  protected abstract manifests(props?: { [key: string]: any }): any[];
}

export class ServiceAccountIRSA extends Construct {
  protected readonly cluster: Cluster;
  protected sa: ServiceAccount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scope: Construct, id: string, cluster: Cluster, props: IrsaProps = {}) {
    super(scope, id);

    this.cluster = cluster;

    //Compute ServiceAccount with IAM role
    const ns = cluster.addManifest('namespace' + id, {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: props.namespace
      }
    });
    let policyStatements: PolicyStatement[];
    if (props.iamPolicyFile != "") {
      policyStatements = json2statements(props.iamPolicyFile!)
    } else if (props.iamPolicy != "") {
      const jsonObject = JSON.parse(props.iamPolicy!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      policyStatements = jsonObject.Statement.map((statement: any) => PolicyStatement.fromJson(statement));
    }
    this.sa = cluster.addServiceAccount("service-account" + id, {
      name: props.name,
      namespace: props.namespace
    })
    const sa = this.sa


    if (policyStatements!.length > 0) {
      policyStatements!.forEach(function (statement) {
        sa.addToPolicy(statement)
      });
    }
    this.sa.node.addDependency(ns)

  }

}

export interface IrsaProps {
  /**
   * (experimental) The name of the service acount to create.
   *
   * @experimental
   */
  readonly name?: string;
  /**
 * (experimental) The name of the namespace where to create the service account.
 *
 * @experimental
 */
  readonly namespace?: string;
  /**
 * (experimental) Optional: name of the policy file in the lib/policies/statements directory
 *
 * @experimental
 */
  readonly iamPolicyFile?: string;
  /**
* (experimental) Optional: Optional: inline policy to affect to the new service account
* @experimental
*/
  readonly iamPolicy?: string;
}

export class K8sHelmChartIRSA extends Construct {
  protected readonly cluster: Cluster;
  protected sa: ServiceAccount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scope: Construct, id: string, cluster: Cluster, irsa: IrsaProps, props: HelmChartProps) {
    super(scope, id);

    this.cluster = cluster;

    let policyStatements: PolicyStatement[];
    if (irsa.iamPolicyFile != undefined && irsa.iamPolicyFile != "") {
      policyStatements = json2statements(irsa.iamPolicyFile!)
    } else if (irsa.iamPolicy != undefined && irsa.iamPolicy != "") {
      const jsonObject = JSON.parse(irsa.iamPolicy!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      policyStatements = jsonObject.Statement.map((statement: any) => PolicyStatement.fromJson(statement));
    }
    if (irsa.name != undefined) {
      this.sa = cluster.addServiceAccount("service-account" + id, {
        name: irsa.name,
        namespace: props.namespace
      })
      const sa = this.sa
      if (policyStatements!.length > 0) {
        policyStatements!.forEach(function (statement) {
          sa.addToPolicy(statement)
        });
      }
    }

    const resource = new HelmChart(this, id + 'HelmChart', props);

    if (this.sa) {
      resource.node.addDependency(this.sa)
    }

  }

}