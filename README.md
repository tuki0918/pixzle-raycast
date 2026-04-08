<div align="center">
  <img src="https://raw.githubusercontent.com/tuki0918/pixzle-raycast/main/assets/extension-icon.png" alt="pixzle Icon" width="128" height="128">
  <h1 align="center">pixzle</h1>
</div>

This Raycast extension provides functionality for image fragmentation and restoration.

Note: This does not guarantee strong security.

## Commands

- `Shuffle Images` ... Shuffle images into fragments
- `Restore Images` ... Restore images from fragments

## Preferences

<details>
<summary>You can customize the extension behavior through the following preferences:</summary>

### Block Size
- **Type**: Dropdown (1, 2, 3, 4, 8, 16, 32, 64, 128, 256)
- **Default**: `8`
- **Description**: Split the image into blocks and shuffle them. Larger block sizes use less memory but result in less fragmentation.

### File Prefix
- **Type**: Text field
- **Default**: `img`
- **Description**: Set the prefix for shuffled output filenames.

### File Name
- **Type**: Checkbox
- **Default**: `Enabled`
- **Description**: Restore the original file name when restoring.

</details>

## Dependencies

- [pixzle](https://github.com/tuki0918/pixzle)
