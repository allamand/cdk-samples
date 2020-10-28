import { K8sManifest } from './K8sResource';
import { loadManifestYamlAll } from '../utils/manifest_reader';

export class MetricsServer extends K8sManifest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, class-methods-use-this
  protected manifests(): any[] {
    return loadManifestYamlAll('kubernetes-manifests/metrics-server');
  }
}
