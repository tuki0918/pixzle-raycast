import { ActionPanel, Grid, Icon } from "@raycast/api";
import { type ManifestData } from "@pixzle/core";
import { MANIFEST_FILE_NAME } from "../constraints";
import { bufferToDataUrl } from "../utils/helpers";
import { DownloadAllImagesAction } from "./DownloadAction";

interface GridShuffledImagesProps {
  manifest: ManifestData;
  imageBuffers: Buffer[];
  workdir?: string;
}

function GridShuffledImages({ manifest, imageBuffers, workdir }: GridShuffledImagesProps) {
  return (
    <Grid filtering={false} searchText="Shuffled Images" onSearchTextChange={() => {}} inset={Grid.Inset.Small}>
      <Grid.Item
        content={Icon.Document}
        title={MANIFEST_FILE_NAME}
        actions={
          <ActionPanel>
            <DownloadAllImagesAction
              manifest={manifest}
              imageBuffers={imageBuffers}
              workdir={workdir}
              isShuffled={true}
            />
          </ActionPanel>
        }
      />
      {imageBuffers.map((imageBuffer, i) => {
        return (
          <Grid.Item
            key={i}
            content={bufferToDataUrl(imageBuffer)}
            title={`#${i + 1}`}
            actions={
              <ActionPanel>
                <DownloadAllImagesAction
                  manifest={manifest}
                  imageBuffers={imageBuffers}
                  workdir={workdir}
                  isShuffled={true}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}

export default GridShuffledImages;
