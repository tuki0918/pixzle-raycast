import { Form, Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import GridLoadingView from "./GridLoadingView";
import GridRestoredImages from "./GridRestoredImages";
import { useRestoreImages } from "../hooks/useRestoreImages";

function RestoreImagesForm() {
  const { isLoading, data, handleFormSubmit } = useRestoreImages();
  const { handleSubmit, itemProps } = useForm<{ folders: string[] }>({
    onSubmit: handleFormSubmit,
    validation: {
      folders: FormValidation.Required,
    },
  });

  if (isLoading) {
    return <GridLoadingView />;
  }

  if (data) {
    return <GridRestoredImages manifest={data.manifest} imageBuffers={data.imageBuffers} workdir={data.workdir} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Terminal} title="Restore" onSubmit={handleSubmit} />
          <Action icon={Icon.Gear} title="Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description title="How to use" text="Please select the manifest file and the shuffled images." />
      <Form.FilePicker allowMultipleSelection={true} canChooseFiles={true} {...itemProps.folders} />
    </Form>
  );
}

export default RestoreImagesForm;
