import { ActionPanel, Grid, Icon } from "@raycast/api";
import { generateFragmentFileName, type ManifestData } from "@pixzle/core";
import { MANIFEST_FILE_NAME } from "../constraints";
import { bufferToDataUrl } from "../utils/helpers";
import { DownloadAllImagesAction, DownloadImageAction } from "./DownloadAction";
import { PreviewImageAction } from "./ImagePreviewDetail";

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
        const fileName = generateFragmentFileName(manifest, i);
        const detailActions = (
          <ActionPanel>
            <DownloadImageAction
              manifest={manifest}
              imageBuffer={imageBuffer}
              fileName={fileName}
              workdir={workdir}
              imageBuffers={imageBuffers}
              isShuffled={true}
            />
            <DownloadAllImagesAction
              manifest={manifest}
              imageBuffers={imageBuffers}
              workdir={workdir}
              isShuffled={true}
            />
          </ActionPanel>
        );
        return (
          <Grid.Item
            key={i}
            content={bufferToDataUrl(imageBuffer)}
            title={fileName}
            subtitle={`#${i + 1}`}
            actions={
              <ActionPanel>
                <PreviewImageAction title={fileName} imageBuffer={imageBuffer} actions={detailActions} />
                <DownloadImageAction
                  manifest={manifest}
                  imageBuffer={imageBuffer}
                  fileName={fileName}
                  workdir={workdir}
                  imageBuffers={imageBuffers}
                  isShuffled={true}
                />
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
