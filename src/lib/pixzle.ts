import { type FragmentationConfig, type ManifestData } from "@pixzle/core";
import { ImageFragmenter, ImageRestorer, loadJson } from "@pixzle/node";
import { MANIFEST_FILE_NAME } from "../constraints";

export async function readManifest(manifestPath: string) {
  return await loadJson<ManifestData>(manifestPath);
}

export function validateShuffleFiles(imagePaths?: string[]) {
  if (!imagePaths || imagePaths.length === 0) throw new Error("Target image files are required");
  return { imagePaths };
}

export function validateRestoreFiles(manifest?: ManifestData, imagePaths?: string[]) {
  if (!manifest) throw new Error(`${MANIFEST_FILE_NAME} is required`);
  if (!imagePaths || imagePaths.length === 0) throw new Error("Target image files are required");
  if (manifest.images.length !== imagePaths.length) {
    throw new Error(`Number of image files does not match: ${imagePaths.length} / ${manifest.images.length}`);
  }
  return { manifest, imagePaths };
}

export async function shuffleImages(config: FragmentationConfig, imagePaths: string[]) {
  const fragmenter = new ImageFragmenter(config);
  return await fragmenter.fragmentImages(imagePaths);
}

export async function restoreImages(imagePaths: string[], manifest: ManifestData) {
  const restorer = new ImageRestorer();
  return await restorer.restoreImages(imagePaths, manifest);
}
