import rawReleaseConfig from "../../release.config.json";
import {
  compareVersions,
  createReleaseMetadata,
  formatReleaseNotes,
  normalizeVersion,
} from "../lib/update-utils";

export interface ReleaseConfig {
  repository: {
    owner: string;
    name: string;
  };
  autoUpdate: {
    checkIntervalMinutes: number;
    feedUrl?: string;
  };
  release: {
    version: string;
    name: string;
    publishedAt: string;
    notes: string[];
  };
}

export const releaseConfig = rawReleaseConfig as ReleaseConfig;

export const currentRelease = releaseConfig.release;

export const currentReleaseMetadata = createReleaseMetadata(currentRelease);

export { compareVersions, formatReleaseNotes, normalizeVersion };
