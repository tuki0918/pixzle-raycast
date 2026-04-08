import { usePromise } from "@raycast/utils";
import GridLoadingView from "./components/GridLoadingView";
import GridShuffledImages from "./components/GridShuffledImages";
import ShuffleImagesForm from "./components/ShuffleImagesForm";
import { useShuffleImages } from "./hooks/useShuffleImages";

export default function Command() {
  const { isLoading, isInstantCall, data, initialize } = useShuffleImages();
  const { isLoading: isInitializing } = usePromise(async () => await initialize(), []);

  if (isLoading || isInitializing) {
    return <GridLoadingView />;
  }

  if (isInstantCall && data) {
    return <GridLoadingView title="Shuffling images..." />;
  }

  if (data) {
    return <GridShuffledImages manifest={data.manifest} imageBuffers={data.imageBuffers} workdir={data.workdir} />;
  }

  return <ShuffleImagesForm />;
}
