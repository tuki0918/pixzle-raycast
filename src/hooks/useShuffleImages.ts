import { useState, useCallback, useEffect, useRef } from "react";
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
  error?: string;
  data?: ShuffleImagesData;
  initialize: () => Promise<void>;
  handleFormSubmit: (values: ShuffleImagesFormValues) => Promise<void>;
}

type ProcessingMode = "instant" | "manual";

type ShuffleImagesData = {
  mode: ProcessingMode;
  manifest: ManifestData;
  imageBuffers: Buffer[];
  workdir: string | undefined;
};

export function useShuffleImages(): UseShuffleImagesResult {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, error, setError, handleError, setIsLoading, showErrorToast } = useLoadingState();
  const [data, setData] = useState<ShuffleImagesData>();
  const initializeStartedRef = useRef(false);
  const instantCallStartedRef = useRef(false);

  useEffect(() => {
    if (error) {
      showErrorToast("Shuffling failed.", error);
    }
  }, [error, showErrorToast]);

  const handleInstantCall = useCallback(async () => {
    if (data?.mode !== "instant" || instantCallStartedRef.current) {
      return;
    }
    instantCallStartedRef.current = true;

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
  }, [data]);

  useEffect(() => {
    handleInstantCall();
  }, [handleInstantCall]);

  const handleShuffle = useCallback(
    async (imagePathsArg?: string[], workdirArg?: string, mode: ProcessingMode = "manual") => {
      setIsLoading(true);
      setError(undefined);

      try {
        const validated = validateShuffleFiles(imagePathsArg);
        const { manifest, fragmentedImages } = await shuffleImages(
          {
            blockSize: Number(preferences.blockSize),
            prefix: preferences.prefix,
            preserveName: preferences.preserveName,
            crossImageShuffle: preferences.crossImageShuffle,
          },
          validated.imagePaths,
        );
        setData({ mode, manifest, imageBuffers: fragmentedImages, workdir: workdirArg });
        setIsLoading(false);
      } catch (e) {
        handleError(e);
      }
    },
    [handleError, preferences, setError, setIsLoading],
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

      const { imagePaths } = await findImages(filePaths);
      const validated = validateShuffleFiles(imagePaths);
      await handleShuffle(validated.imagePaths, undefined, "instant");
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
    error,
    data,
    initialize,
    handleFormSubmit,
  };
}
