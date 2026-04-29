<div align="center">
  <img src="assets/extension-icon.png" alt="pixzle Icon" width="128" height="128">
  <h1 align="center">pixzle</h1>
</div>

This Raycast extension provides functionality for image fragmentation and restoration.

Note: This does not guarantee strong security.

## Setup

Install dependencies first:

```bash
npm install
```

This extension uses a vendored copy of `sharp` because Raycast's bundled runtime does not reliably resolve the native module from the top-level `node_modules`.

The `postinstall` script copies the required runtime files into `assets/vendor` automatically.

Then build or run the extension:

```bash
npm run build
```

For development in Raycast, you can also use:

```bash
npm run dev
```

If you reinstall dependencies or update `sharp`, `npm install` runs the vendoring step again. You can also run it manually with:

```bash
npm run postinstall
```

Vendored binaries target the macOS architecture used when `npm install` runs.

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

### Cross Image Shuffle
- **Type**: Checkbox
- **Default**: `Disabled`
- **Description**: Shuffle blocks across all selected images instead of shuffling each image independently.

</details>

## Dependencies

- [pixzle](https://github.com/tuki0918/pixzle)
