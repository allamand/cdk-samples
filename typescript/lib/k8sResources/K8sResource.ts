import { Construct } from "@aws-cdk/core";
import { Cluster, HelmChart, HelmChartOptions, HelmChartProps, KubernetesManifest } from "@aws-cdk/aws-eks";
import { ServiceAccount } from "@aws-cdk/aws-eks/lib/service-account";
import { json2statements } from "../policies/PolicyUtils";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { exit } from "process";
import { truncate } from "fs";

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
   * (experimental) Do we need to create the Namespace ?
   *
   * @experimental
   */
  createNamespace?: boolean;
  /**
   * (experimental) Optional: name of the policy file in the lib/policies/statements directory
   *
   * @experimental
   */
  readonly iamPolicyFile?: string;
  /**
   * (experimental) Optional: url of the policy manifest file
   *
   * @experimental
   */
  readonly iamPolicyUrl?: string;
  /**
   * (experimental) Optional: Optional: inline policy to affect to the new service account
   * @experimental
   */
  readonly iamPolicyInline?: string;
}

export class ServiceAccountIRSA extends Construct {
  protected readonly cluster: Cluster;
  public sa: ServiceAccount;
  public ns: Construct;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scope: Construct, id: string, cluster: Cluster, props: IrsaProps = {}) {
    super(scope, id);

    this.cluster = cluster;

    //Create namespace
    if (props.createNamespace) {
      this.ns = cluster.addManifest("namespace" + id, {
        apiVersion: "v1",
        kind: "Namespace",
        metadata: {
          name: props.namespace,
        },
      });
    }
    //Create ServiceAccount
    this.sa = cluster.addServiceAccount("sa" + id, {
      name: props.name,
      namespace: props.namespace,
    });
    const sa = this.sa;
    if (props.createNamespace) {
      this.sa.node.addDependency(this.ns);
    }

    //Retrieve IAM Policy
    let policyStatements: PolicyStatement[] = [];
    if (props.iamPolicyFile && props.iamPolicyFile != "") {
      policyStatements = json2statements(props.iamPolicyFile!);
    } else if (props.iamPolicyUrl && props.iamPolicyUrl != "") {
      const request = require("sync-request");
      const policyJson = request("GET", props.iamPolicyUrl).getBody();
      const jsonObject = JSON.parse(policyJson);
      policyStatements = jsonObject.Statement.map((statement: any) => PolicyStatement.fromJson(statement));
    } else if (props.iamPolicyInline && props.iamPolicyInline != "") {
      const jsonObject = JSON.parse(props.iamPolicyInline!);
      policyStatements = jsonObject.Statement.map((statement: any) => PolicyStatement.fromJson(statement));
    }

    //Add IAM Policy to Service Account
    if (policyStatements != [] && policyStatements.length > 0) {
      policyStatements.forEach(function (statement) {
        if (statement as PolicyStatement) {
          sa.addToPolicy(statement);
        }
      });
    }
  }
}

export abstract class K8sManifest extends Construct {
  protected readonly cluster: Cluster;
  //protected sa: ServiceAccount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any } = {}) {
    super(scope, id);
    this.cluster = cluster;
    //Retrieved Kubernetes manifests
    const manifest = this.manifests(props);
    const resource = new KubernetesManifest(this, id + "K8sManifest", {
      cluster: this.cluster,
      manifest,
    });
    //resource.node.addDependency(this.cluster)
    //    if (this.sa) {
    //    resource.node.addDependency(this.sa)
    //}
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, class-methods-use-this
  protected abstract manifests(props?: { [key: string]: any }): any[];
}

export abstract class K8sManifestIRSA extends Construct {
  protected readonly cluster: Cluster;
  public sa: ServiceAccount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any } = {}) {
    super(scope, id);

    this.cluster = cluster;
    const irsa: IrsaProps = props.irsa;
    if (!irsa.namespace) {
      console.error("no namespace in ressource " + id);
    }
    if (!irsa.createNamespace) {
      irsa["createNamespace"] = true;
    }
    const irsaResource = new ServiceAccountIRSA(this, id + "-irsa", cluster, irsa);
    this.sa = irsaResource.sa;

    //Retrieved Kubernetes manifests
    const manifests = this.manifests(props);

    // const resource = new KubernetesManifest(this, 'K8sResourceIRSA', {
    //   cluster: this.cluster,
    //   manifests,
    // });

    // should be equivalent, https://docs.aws.amazon.com/cdk/api/latest/docs/aws-eks-readme.html#kubernetes-resources
    // .. but it's not here..

    let i = 0;
    manifests.forEach((manifest) => {
      const resource = this.cluster.addManifest(id + "-" + i++, manifest);
      resource.node.addDependency(irsaResource.ns); //it sezms that the dependency to work, we need an official construct, here I choose namespace
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, class-methods-use-this
  protected abstract manifests(props?: { [key: string]: any }): any[];
}

export class K8sHelmChartIRSA extends Construct {
  protected readonly cluster: Cluster;
  public sa: ServiceAccount;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(scope: Construct, id: string, cluster: Cluster, irsa: IrsaProps, props: HelmChartProps) {
    super(scope, id);

    this.cluster = cluster;

    const irsaResource = new ServiceAccountIRSA(this, id + "-irsa", cluster, irsa);
    this.sa = irsaResource.sa;

    const resource = new HelmChart(this, id + "HelmChart", props);
    resource.node.addDependency(irsaResource);
    /*
        if (this.sa) {
          resource.node.addDependency(this.sa)
        }
    */
  }
}
