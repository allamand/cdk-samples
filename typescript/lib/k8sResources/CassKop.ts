import { Aspects, Construct, Duration, Tag } from '@aws-cdk/core';
import { Cluster, HelmChart, HelmChartProps } from '@aws-cdk/aws-eks';
import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');

import { DEFAULT_CLUSTER_VERSION, DEFAULT_DOMAIN_ZONE } from '../defaults';
import { K8sHelmChartIRSA } from './K8sResource';
import { loadManifestYaml } from '../utils/manifest_reader';
import { setTimeout } from 'timers';

/*
** This Construct will create an AWS for FluentBit deployment as a daemonset in your EKS cluster, using IRSA.
*/
export class CassKop extends Construct {
    protected readonly cluster: Cluster;

    constructor(scope: Construct, id: string, cluster: Cluster, props: { [key: string]: any }) {
        super(scope, id);

        this.cluster = cluster;

        const CassKopManifestBaseUrl = `https://raw.githubusercontent.com/Orange-OpenSource/casskop/master/`;

        const clusterVersion = this.node.tryGetContext('cluster_version') || process.env.cluster_version || DEFAULT_CLUSTER_VERSION

        let CassKopCrdUrl = `${CassKopManifestBaseUrl}deploy/crds/db.orange.com_cassandraclusters_crd.yaml`;
        let CassKopCrdRestoresUrl = `${CassKopManifestBaseUrl}deploy/crds/db.orange.com_cassandrarestores_crd.yaml`;
        let CassKopCrdBackupUrl = `${CassKopManifestBaseUrl}deploy/crds/db.orange.com_cassandrabackups_crd.yaml`;
        if (clusterVersion < "1.16") {
            CassKopCrdUrl = `${CassKopManifestBaseUrl}deploy/crds/v1beta1/db.orange.com_cassandraclusters_crd.yaml`;
            CassKopCrdRestoresUrl = `${CassKopManifestBaseUrl}deploy/crds/v1beta1/db.orange.com_cassandrarestores_crd.yaml`;
            CassKopCrdBackupUrl = `${CassKopManifestBaseUrl}deploy/crds/v1beta1/db.orange.com_cassandrabackups_crd.yaml`;
        }

        const yaml = require('js-yaml');
        const request = require('sync-request');
        const CassKopCrdManifest = yaml.safeLoad(request('GET', CassKopCrdUrl).getBody());
        const CassKopCrdRestoreManifest = yaml.safeLoad(request('GET', CassKopCrdRestoresUrl).getBody());
        const CassKopCrdBackupManifest = yaml.safeLoad(request('GET', CassKopCrdBackupUrl).getBody());

        const crd = cluster.addManifest(id + '-crd', CassKopCrdManifest);
        cluster.addManifest(id + '-crd-restore', CassKopCrdRestoreManifest);
        cluster.addManifest(id + '-crd-backup', CassKopCrdBackupManifest);
        //const crd = cluster.addManifest(id + '-crd', [CassKopCrdManifest, CassKopCrdRestoreManifest, CassKopCrdBackupManifest]);

        const chartProps: HelmChartProps = {
            cluster: cluster,
            chart: "cassandra-operator",
            release: id,
            repository: "https://orange-kubernetes-charts-incubator.storage.googleapis.com/",
            namespace: "cassandra",
            wait: true,
            createNamespace: true,
            timeout: Duration.minutes(15)
        }

        const helm = new HelmChart(this, id + 'HelmChart', chartProps);
        helm.node.addDependency(crd);

    }


}
