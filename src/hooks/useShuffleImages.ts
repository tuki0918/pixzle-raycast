import { useState, useCallback, useEffect } from "react";
import { getPreferenceValues, PopToRootType, showHUD } from "@raycast/api";
import { generateFragmentFileName, type ManifestData } from "@pixzle/core";
import pLimit from "p-limit";
import { findImages, getSelectedItems, writeManifest, writeShuffledImage } from "../utils/helpers";
import { shuffleImages, validateShuffleFiles } from "../lib/pixzle";
import { type ShuffleImagesFormValues } from "../components/ShuffleImagesForm";
import { dirExists } from "../utils/file";
import { useLoadingState } from "./useLoadingState";
import { MANIFEST_FILE_NAME, CONCURRENCY_LIMIT } from "../constraints";

interface UseShuffleImagesResult {
  isLoading: boolean;
  isInstantCall: boolean;
  error?: string;
  data?: { manifest: ManifestData; imageBuffers: Buffer[]; workdir: string | undefined };
  initialize: () => Promise<void>;
  handleFormSubmit: (values: ShuffleImagesFormValues) => Promise<void>;
}

export function useShuffleImages(): UseShuffleImagesResult {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, error, setError, handleError, setIsLoading, showErrorToast } = useLoadingState();
  const [isInstantCall, setIsInstantCall] = useState(false);
  const [data, setData] = useState<
    { manifest: ManifestData; imageBuffers: Buffer[]; workdir: string | undefined } | undefined
  >();

  useEffect(() => {
    if (error) {
      showErrorToast("Shuffling failed.", error);
    }
  }, [error, showErrorToast]);

  const handleInstantCall = useCallback(async () => {
    if (!isInstantCall || !data) {
      return;
    }

    const { manifest, imageBuffers, workdir } = data;
    await writeManifest(manifest, MANIFEST_FILE_NAME, workdir);

    const limit = pLimit(CONCURRENCY_LIMIT);
    await Promise.all(
      imageBuffers.map(async (imageBuffer, i) =>
        limit(async () => {
          const fileName = generateFragmentFileName(manifest, i);
          await writeShuffledImage(manifest, imageBuffer, fileName, workdir);
        }),
      ),
    );

    await showHUD("🎉 All images shuffled successfully!", {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  }, [data, isInstantCall]);

  useEffect(() => {
    handleInstantCall();
  }, [handleInstantCall]);

  const handleShuffle = useCallback(
    async (imagePathsArg?: string[], workdirArg?: string) => {
      setIsLoading(true);
      setError(undefined);

      try {
        const validated = validateShuffleFiles(imagePathsArg);
        const { manifest, fragmentedImages } = await shuffleImages(
          {
            blockSize: Number(preferences.blockSize),
            prefix: preferences.prefix,
            preserveName: preferences.preserveName,
          },
          validated.imagePaths,
        );
        setData({ manifest, imageBuffers: fragmentedImages, workdir: workdirArg });
        setIsLoading(false);
      } catch (e) {
        handleError(e);
      }
    },
    [handleError, preferences, setError, setIsLoading],
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
      const { imagePaths } = await findImages(filePaths);
      const validated = validateShuffleFiles(imagePaths);
      await handleShuffle(validated.imagePaths);
      setIsLoading(false);
    } catch (e) {
      handleError(e);
    }
  }, [handleError, handleShuffle, setError, setIsLoading]);

  const handleFormSubmit = useCallback(
    async (values: ShuffleImagesFormValues) => {
      try {
        setIsLoading(true);
        setError(undefined);

        const { folders, outputDir } = values;
        const { imagePaths } = await findImages(folders);
        const workdir = outputDir.length > 0 ? outputDir[0] : undefined;

        if (workdir && !(await dirExists(workdir))) {
          throw new Error(`"${workdir}" does not exist.`);
        }

        const validated = validateShuffleFiles(imagePaths);
        await handleShuffle(validated.imagePaths, workdir);
        setIsLoading(false);
      } catch (e) {
        handleError(e);
      }
    },
    [handleError, handleShuffle, setError, setIsLoading],
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
