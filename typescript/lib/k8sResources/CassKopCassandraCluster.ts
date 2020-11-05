import { Aspects, Construct, Duration, Tag } from '@aws-cdk/core';
import { Cluster, HelmChart, HelmChartProps, KubernetesManifest } from '@aws-cdk/aws-eks';
import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import * as YAML from 'js-yaml';

import { DEFAULT_CLUSTER_VERSION, DEFAULT_HOSTED_ZONE } from '../defaults';
import { K8sHelmChartIRSA } from './K8sResource';
import { loadManifestYaml, loadManifestYamlAll } from '../utils/manifest_reader';
import { setTimeout } from 'timers';

/*
** This Construct will create an AWS for FluentBit deployment as a daemonset in your EKS cluster, using IRSA.
*/
export class CassKopCassandraCluster extends Construct {
    protected readonly cluster: Cluster;

    constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any }) {
        super(scope, id);

        this.cluster = cluster;

        let manifests = loadManifestYamlAll('kubernetes-manifests/casskop/');
        //    let manifests = loadManifestYaml('kubernetes-manifests/casskop2/cassandracluster-demo-aws-eks.yaml');

        //console.debug(YAML.safeDump(manifests))

        const CassandraCluster = manifests.find((manifest) => manifest.kind === 'CassandraCluster');
        const cassandraNodesPerRacks = this.node.tryGetContext('cassandra_nodes_per_racks') || process.env.cassandra_nodes_per_racks
        CassandraCluster.spec.topology.dc[0].nodesPerRacks = Number(cassandraNodesPerRacks);

        const resource = new KubernetesManifest(this, 'CassKopCassandraCluster', {
            cluster: this.cluster,
            manifest: manifests,
        });

        //cluster.addManifest(id, manifests);

    }


}
