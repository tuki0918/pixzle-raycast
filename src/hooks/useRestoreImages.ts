import { useState, useCallback, useEffect } from "react";
import { PopToRootType, showHUD } from "@raycast/api";
import { generateRestoredFileName, generateRestoredOriginalFileName, type ManifestData } from "@pixzle/core";
import pLimit from "p-limit";
import { findManifestAndImages, getSelectedItems, writeRestoredImage } from "../utils/helpers";
import { readManifest, restoreImages, validateRestoreFiles } from "../lib/pixzle";
import { useLoadingState } from "./useLoadingState";
import { CONCURRENCY_LIMIT } from "../constraints";

interface UseRestoreImagesResult {
  isLoading: boolean;
  isInstantCall: boolean;
  error?: string;
  data?: { manifest: ManifestData; imageBuffers: Buffer[]; workdir: string | undefined };
  initialize: () => Promise<void>;
  handleFormSubmit: (values: { folders: string[] }) => Promise<void>;
}

export function useRestoreImages(): UseRestoreImagesResult {
  const { isLoading, error, setError, handleError, setIsLoading, showErrorToast } = useLoadingState();
  const [isInstantCall, setIsInstantCall] = useState(false);
  const [data, setData] = useState<
    { manifest: ManifestData; imageBuffers: Buffer[]; workdir: string | undefined } | undefined
  >();

  useEffect(() => {
    if (error) {
      showErrorToast("Restoring failed.", error);
    }
  }, [error, showErrorToast]);

  const handleInstantCall = useCallback(async () => {
    if (!isInstantCall || !data) {
      return;
    }

    const { manifest, imageBuffers, workdir } = data;
    const limit = pLimit(CONCURRENCY_LIMIT);
    await Promise.all(
      imageBuffers.map(async (imageBuffer, i) =>
        limit(async () => {
          const imageInfo = manifest.images[i];
          const fileName = generateRestoredOriginalFileName(imageInfo) ?? generateRestoredFileName(manifest, i);
          await writeRestoredImage(manifest, imageBuffer, fileName, workdir);
        }),
      ),
    );

    await showHUD("🎉 All images restored successfully!", {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  }, [data, isInstantCall]);

  useEffect(() => {
    handleInstantCall();
  }, [handleInstantCall]);

  const handleRestore = useCallback(
    async (manifestArg?: ManifestData, imagePathsArg?: string[], workdirArg?: string) => {
      setIsLoading(true);
      setError(undefined);

      try {
        const validated = validateRestoreFiles(manifestArg, imagePathsArg);
        const imageBuffers = await restoreImages(validated.imagePaths, validated.manifest);
        setData({ manifest: validated.manifest, imageBuffers, workdir: workdirArg });
        setIsLoading(false);
      } catch (e) {
        handleError(e);
      }
    },
    [handleError, setError, setIsLoading],
  );

  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      const filePaths = await getSelectedItems();
      if (filePaths.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsInstantCall(true);
      const { manifestPath, imagePaths, workdir } = await findManifestAndImages(filePaths);
      const manifest = await readManifest(manifestPath);
      const validated = validateRestoreFiles(manifest, imagePaths);
      await handleRestore(validated.manifest, validated.imagePaths, workdir);
      setIsLoading(false);
    } catch (e) {
      handleError(e);
    }
  }, [handleError, handleRestore, setError, setIsLoading]);

  const handleFormSubmit = useCallback(
    async (values: { folders: string[] }) => {
      try {
        setIsLoading(true);
        setError(undefined);

        const { manifestPath, imagePaths, workdir } = await findManifestAndImages(values.folders);
        const manifest = await readManifest(manifestPath);
        const validated = validateRestoreFiles(manifest, imagePaths);
        await handleRestore(validated.manifest, validated.imagePaths, workdir);
        setIsLoading(false);
      } catch (e) {
        handleError(e);
      }
    },
    [handleError, handleRestore, setError, setIsLoading],
  );

  return {
    isLoading,
    isInstantCall,
    error,
    data,
    initialize,
    handleFormSubmit,
  };
}
