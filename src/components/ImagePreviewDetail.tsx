import { Action, Detail, Icon } from "@raycast/api";
import { type ReactNode } from "react";
import { bufferToDataUrl } from "../utils/helpers";

interface ImagePreviewDetailProps {
  title: string;
  imageBuffer: Buffer;
  actions?: ReactNode;
}

function ImagePreviewDetail({ title, imageBuffer, actions }: ImagePreviewDetailProps) {
  return <Detail navigationTitle={title} markdown={`![${title}](${bufferToDataUrl(imageBuffer)})`} actions={actions} />;
}

interface PreviewImageActionProps extends ImagePreviewDetailProps {
  actionTitle?: string;
}

export function PreviewImageAction({
  title,
  imageBuffer,
  actions,
  actionTitle = "Preview Image",
}: PreviewImageActionProps) {
  return <Action.Push title={actionTitle} icon={Icon.Eye} target={<ImagePreviewDetail title={title} imageBuffer={imageBuffer} actions={actions} />} />;
}

export default ImagePreviewDetail;
