import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import iam = require('@aws-cdk/aws-iam');
import { VpcProvider } from './vpc';


export class EksNginxStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // use an existing vpc or create a new one
    const vpc = VpcProvider.getOrCreate(this)

    const mastersRole = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'EKSCluster', {
      vpc,
      mastersRole
    });

    const appLabel = { app: "nginx" };

    const ngxDeployment = {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: { name: "nginx" },
      spec: {
        replicas: 2,
        selector: { matchLabels: appLabel },
        template: {
          metadata: { labels: appLabel },
          spec: {
            containers: [
              {
                name: "nginx",
                image: "nginx"
              }
            ]
          }
        }
      }
    };

    const ngxSvc = {
      apiVersion: "v1",
      kind: "Service",
      metadata: { name: "nginx" },
      spec: {
        selector: {
          app: "nginx"
        },
        ports: [
          {
            name: "web",
            port: 80,
            targetPort: 80
          }
        ],
        type: "LoadBalancer"
      }
    }

    const caddyDeployment = {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: { name: "caddy" },
      spec: {
        replicas: 2,
        selector: { matchLabels: { app: "caddy" } },
        template: {
          metadata: { labels: { app: "caddy" } },
          spec: {
            containers: [
              {
                name: "caddy",
                image: "abiosoft/caddy"
              }
            ]
          }
        }
      }
    };

    const caddySvc = {
      apiVersion: "v1",
      kind: "Service",
      metadata: { name: "caddy" },
      spec: {
        selector: {
          app: "caddy"
        },
        ports: [
          {
            name: "caddy",
            port: 80,
            targetPort: 2015
          }
        ],
        type: "LoadBalancer"
      }
    };


    const manifest = [
      caddyDeployment,
      caddySvc
    ]

    new eks.KubernetesResource(this, 'MyCustomResource', {
      cluster,
      manifest
    })

    cluster.addResource('MyResources', ngxDeployment, ngxSvc);
    // cluster.addResource('MyResources', ngxDeployment, ngxSvc);

  }
}

