import { Action, Icon, showToast, Toast } from "@raycast/api";
import {
  generateFragmentFileName,
  generateRestoredFileName,
  generateRestoredOriginalFileName,
  type ManifestData,
} from "@pixzle/core";
import pLimit from "p-limit";
import { writeManifest, writeRestoredImage, writeShuffledImage } from "../utils/helpers";
import { MANIFEST_FILE_NAME, CONCURRENCY_LIMIT } from "../constraints";

interface DownloadActionProps {
  manifest: ManifestData;
  imageBuffers: Buffer[];
  workdir?: string;
  isShuffled?: boolean;
}

export function DownloadAllImagesAction({ manifest, imageBuffers, workdir, isShuffled = false }: DownloadActionProps) {
  return (
    <Action
      title="Download All"
      icon={{ source: Icon.Download }}
      onAction={async () => {
        if (isShuffled) {
          await writeManifest(manifest, MANIFEST_FILE_NAME, workdir);
          const limit = pLimit(CONCURRENCY_LIMIT);
          await Promise.all(
            imageBuffers.map(async (imageBuffer, i) => {
              return limit(async () => {
                const fileName = generateFragmentFileName(manifest, i);
                await writeShuffledImage(manifest, imageBuffer, fileName, workdir);
              });
            }),
          );
        } else {
          const limit = pLimit(CONCURRENCY_LIMIT);
          await Promise.all(
            imageBuffers.map(async (imageBuffer, i) => {
              return limit(async () => {
                const imageInfo = manifest.images[i] ?? {};
                const fileName = generateRestoredOriginalFileName(imageInfo) ?? generateRestoredFileName(manifest, i);
                await writeRestoredImage(manifest, imageBuffer, fileName, workdir);
              });
            }),
          );
        }
        await showToast({
          title: "Downloaded",
          message: "All files downloaded successfully.",
          style: Toast.Style.Success,
        });
      }}
    />
  );
}

export function DownloadImageAction({
  manifest,
  imageBuffer,
  fileName,
  workdir,
  isShuffled = false,
}: DownloadActionProps & { imageBuffer: Buffer; fileName: string }) {
  return (
    <Action
      title="Download"
      icon={{ source: Icon.Download }}
      onAction={async () => {
        if (isShuffled) {
          await writeShuffledImage(manifest, imageBuffer, fileName, workdir);
        } else {
          await writeRestoredImage(manifest, imageBuffer, fileName, workdir);
        }
        await showToast({
          title: "Downloaded",
          message: "Image downloaded successfully.",
          style: Toast.Style.Success,
        });
      }}
    />
  );
}
