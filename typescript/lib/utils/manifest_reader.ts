import * as YAML from 'js-yaml';
import * as fs from 'fs';

/**
 * loadManifestYaml return yamlData from a filePath
 * @param filePath is the path to the yaml file
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadManifestYaml(filePath: string): any[] {
  const yamlFile = fs.readFileSync(filePath, 'utf8');
  const yamlData = YAML.safeLoadAll(yamlFile);
  return yamlData;
}

export function loadManifestYamlWithoutServiceAcount(filePath: string): any[] {
  const yamlFile = fs.readFileSync(filePath, 'utf8');
  const yamlData = YAML.safeLoadAll(yamlFile).filter((manifest: any) => {
    return manifest['kind'] != 'ServiceAccount'
  });
  return yamlData;
}

/**
 * loadManifestYamlAll will return a manifests tab with yaml content of all file of a directory
 * @param dirPath is the directory from witch we will read yaml files
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadManifestYamlAll(dirPath: string): any[] {
  const files = fs.readdirSync(dirPath).filter((fileName: string) => fileName.endsWith('.yaml'));
  const manifests: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  files.forEach((file) => manifests.push(...loadManifestYaml(`${dirPath}/${file}`)));
  return manifests;
}
