import { usePromise } from "@raycast/utils";
import GridLoadingView from "./components/GridLoadingView";
import GridRestoredImages from "./components/GridRestoredImages";
import RestoreImagesForm from "./components/RestoreImagesForm";
import { useRestoreImages } from "./hooks/useRestoreImages";

export default function Command() {
  const { isLoading, isInstantCall, data, initialize } = useRestoreImages();
  const { isLoading: isInitializing } = usePromise(async () => await initialize(), []);

  if (isLoading || isInitializing) {
    return <GridLoadingView />;
  }

  if (isInstantCall && data) {
    return <GridLoadingView title="Restoring images..." />;
  }

  if (data) {
    return <GridRestoredImages manifest={data.manifest} imageBuffers={data.imageBuffers} workdir={data.workdir} />;
  }

  return <RestoreImagesForm />;
}
