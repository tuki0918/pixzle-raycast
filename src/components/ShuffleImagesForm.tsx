import { Form, Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useShuffleImages } from "../hooks/useShuffleImages";
import GridLoadingView from "./GridLoadingView";
import GridShuffledImages from "./GridShuffledImages";

export interface ShuffleImagesFormValues {
  folders: string[];
  outputDir: string[];
}

function ShuffleImagesForm() {
  const { isLoading, data, handleFormSubmit } = useShuffleImages();
  const { handleSubmit, itemProps } = useForm<ShuffleImagesFormValues>({
    initialValues: {
      folders: [],
      outputDir: [],
    },
    onSubmit: handleFormSubmit,
    validation: {
      folders: FormValidation.Required,
    },
  });

  if (isLoading) {
    return <GridLoadingView />;
  }

  if (data) {
    return <GridShuffledImages manifest={data.manifest} imageBuffers={data.imageBuffers} workdir={data.workdir} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Terminal} title="Shuffle" onSubmit={handleSubmit} />
          <Action icon={Icon.Gear} title="Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description title="How to use" text="Please select the images to shuffle." />
      <Form.FilePicker
        title="Images"
        allowMultipleSelection={true}
        canChooseFiles={true}
        {...itemProps.folders}
        info="Select images to shuffle."
      />
      <Form.FilePicker
        title="Output Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        {...itemProps.outputDir}
        info="Default: Downloads/{UUID}"
      />
    </Form>
  );
}

export default ShuffleImagesForm;
