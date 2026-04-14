import { getVersion } from '@tauri-apps/api/app';
import { fetch, ResponseType } from '@tauri-apps/api/http';

export const REPO_OWNER = 'Exus-Agencia-Web';
export const REPO_NAME = 'promptclip';
export const REPO_BRANCH = 'main';

const REMOTE_PACKAGE_JSON = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/package.json`;

export interface UpdateStatus {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  downloadUrl: string;
  repoUrl: string;
}

const parseVersion = (version: string): number[] => version
  .split('.')
  .map((part) => parseInt(part, 10))
  .map((n) => (Number.isNaN(n) ? 0 : n));

const isNewer = (remote: string, local: string): boolean => {
  const remoteParts = parseVersion(remote);
  const localParts = parseVersion(local);
  const length = Math.max(remoteParts.length, localParts.length);
  for (let i = 0; i < length; i += 1) {
    const r = remoteParts[i] ?? 0;
    const l = localParts[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
};

const buildDownloadUrl = (version: string): string => `https://github.com/${REPO_OWNER}/${REPO_NAME}/raw/refs/heads/${REPO_BRANCH}/PromptClip-${version}.dmg`;

export const checkForUpdate = async (): Promise<UpdateStatus> => {
  const currentVersion = await getVersion();

  const response = await fetch<{ version?: string }>(REMOTE_PACKAGE_JSON, {
    method: 'GET',
    timeout: 10,
    responseType: ResponseType.JSON,
  });

  if (!response.ok || !response.data || typeof response.data.version !== 'string') {
    throw new Error(`Failed to fetch remote version (status ${response.status})`);
  }

  const latestVersion = response.data.version;
  const updateAvailable = isNewer(latestVersion, currentVersion);

  return {
    currentVersion,
    latestVersion,
    updateAvailable,
    downloadUrl: buildDownloadUrl(latestVersion),
    repoUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}`,
  };
};
