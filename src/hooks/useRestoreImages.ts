import { useState, useCallback, useEffect, useRef } from "react";
import { PopToRootType, showHUD } from "@raycast/api";
import { generateRestoredFileName, generateRestoredOriginalFileName, type ManifestData } from "@pixzle/core";
import pLimit from "p-limit";
import { findManifestAndImages, getSelectedItems, writeRestoredImage } from "../utils/helpers";
import { readManifest, restoreImages, validateRestoreFiles } from "../lib/pixzle";
import { useLoadingState } from "./useLoadingState";
import { CONCURRENCY_LIMIT } from "../constraints";

interface UseRestoreImagesResult {
  isLoading: boolean;
  error?: string;
  data?: RestoreImagesData;
  initialize: () => Promise<void>;
  handleFormSubmit: (values: { folders: string[] }) => Promise<void>;
}

type ProcessingMode = "instant" | "manual";

type RestoreImagesData = {
  mode: ProcessingMode;
  manifest: ManifestData;
  imageBuffers: Buffer[];
  workdir: string | undefined;
};

export function useRestoreImages(): UseRestoreImagesResult {
  const { isLoading, error, setError, handleError, setIsLoading, showErrorToast } = useLoadingState();
  const [data, setData] = useState<RestoreImagesData>();
  const initializeStartedRef = useRef(false);
  const instantCallStartedRef = useRef(false);

  useEffect(() => {
    if (error) {
      showErrorToast("Restoring failed.", error);
    }
  }, [error, showErrorToast]);

  const handleInstantCall = useCallback(async () => {
    if (data?.mode !== "instant" || instantCallStartedRef.current) {
      return;
    }
    instantCallStartedRef.current = true;

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
  }, [data]);

  useEffect(() => {
    handleInstantCall();
  }, [handleInstantCall]);

  const handleRestore = useCallback(
    async (
      manifestArg?: ManifestData,
      imagePathsArg?: string[],
      workdirArg?: string,
      mode: ProcessingMode = "manual",
    ) => {
      setIsLoading(true);
      setError(undefined);

      try {
        const validated = validateRestoreFiles(manifestArg, imagePathsArg);
        const imageBuffers = await restoreImages(validated.imagePaths, validated.manifest);
        setData({ mode, manifest: validated.manifest, imageBuffers, workdir: workdirArg });
        setIsLoading(false);
      } catch (e) {
        handleError(e);
      }
    },
    [handleError, setError, setIsLoading],
  );

  const initialize = useCallback(async () => {
    if (initializeStartedRef.current) {
      return;
    }
    initializeStartedRef.current = true;

    try {
      setIsLoading(true);
      setError(undefined);

      const filePaths = await getSelectedItems();
      if (filePaths.length === 0) {
        setIsLoading(false);
        return;
      }

      const { manifestPath, imagePaths, workdir } = await findManifestAndImages(filePaths);
      const manifest = await readManifest(manifestPath);
      const validated = validateRestoreFiles(manifest, imagePaths);
      await handleRestore(validated.manifest, validated.imagePaths, workdir, "instant");
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
    error,
    data,
    initialize,
    handleFormSubmit,
  };
}
