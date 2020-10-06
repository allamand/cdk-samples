import { Construct } from '@aws-cdk/core';
import {Cluster, HelmChart, HelmChartOptions, HelmChartProps, KubernetesManifest} from '@aws-cdk/aws-eks';
import {ServiceAccount} from "@aws-cdk/aws-eks/lib/service-account";
import {json2statements} from "../policies/PolicyUtils";

export abstract class K8sResource extends Construct {
  protected readonly  cluster: Cluster;
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
  protected readonly  cluster: Cluster;
  protected sa: ServiceAccount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any } = {}) {
    super(scope, id);

    this.cluster = cluster;

    //Compute ServiceAccount with IAM role
    const ns = cluster.addManifest('namespace'+id, {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: props.namespace }
    });
    const policyStatements = json2statements(props.iamPolicyFile)
    this.sa = cluster.addServiceAccount("service-account"+id, {
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
  protected readonly  cluster: Cluster;
  protected sa: ServiceAccount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any } = {}) {
    super(scope, id);

    this.cluster = cluster;
console.debug("props.namespace = " + props.namespace)
    //Compute ServiceAccount with IAM role
    const ns = cluster.addManifest('namespace'+id, {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: props.namespace
      }
    });
    const policyStatements = json2statements(props.iamPolicyFile)
    this.sa = cluster.addServiceAccount("service-account"+id, {
      name: props.name,
      namespace: props.namespace
    })
    const sa = this.sa
    policyStatements.forEach(function (statement) {
      sa.addToPolicy(statement)
    });
    this.sa.node.addDependency(ns)

  }

}


export class K8sHelmChartIRSA extends Construct {
  protected readonly  cluster: Cluster;
  protected sa: ServiceAccount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scope: Construct, id: string, cluster: Cluster, irsa: { [key: string]: any }, props: HelmChartProps) {
    super(scope, id);

    this.cluster = cluster;

    const policyStatements = json2statements(irsa.iamPolicyFile)
    this.sa = cluster.addServiceAccount("service-account"+id, {
      name: irsa.name,
      namespace: props.namespace
    })
    const sa = this.sa
    policyStatements.forEach(function (statement) {
      sa.addToPolicy(statement)
    });

    const resource = new HelmChart(this, id+'HelmChart', props);

    if (this.sa) {
      resource.node.addDependency(this.sa)
    }

  }

}