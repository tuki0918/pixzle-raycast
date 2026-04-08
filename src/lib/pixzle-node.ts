import crypto from "node:crypto";
import { existsSync, promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  DEFAULT_FRAGMENTATION_CONFIG,
  RGBA_CHANNELS,
  encodeFileName,
  fragmentImageBuffers,
  restoreImageBuffers,
  validateFileNames,
  validateFragmentImageCount,
  type FragmentationConfig,
  type ImageBufferData,
  type ImageInfo,
  type ManifestData,
} from "@pixzle/core";

const PIXZLE_NODE_VERSION = "0.2.0";
const SEED_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SEED_LENGTH = 12;
const VENDORED_SHARP_PACKAGE_PATH = path.join("assets", "vendor", "node_modules", "sharp", "package.json");

type SharpMetadata = {
  format?: string;
};

type SharpInfo = {
  width?: number;
  height?: number;
  format?: string;
};

type SharpToBufferResult = {
  data: Buffer;
  info: SharpInfo;
};

type SharpInstance = {
  ensureAlpha(): SharpInstance;
  metadata(): Promise<SharpMetadata>;
  raw(): SharpInstance;
  png(): SharpInstance;
  toBuffer(options?: { resolveWithObject?: boolean }): Promise<Buffer | SharpToBufferResult>;
  toFile(outputPath: string): Promise<unknown>;
};

type SharpModule = (input: Buffer | string, options?: unknown) => SharpInstance;
type BaseFragmentationConfig = Omit<Required<FragmentationConfig>, "seed"> & Pick<FragmentationConfig, "seed">;

let cachedSharp: SharpModule | undefined;

function getVendoredSharpRequire() {
  const candidates = [
    path.join(__dirname, VENDORED_SHARP_PACKAGE_PATH),
    path.join(process.cwd(), VENDORED_SHARP_PACKAGE_PATH),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return createRequire(candidate);
    }
  }

  throw new Error(
    "Vendored sharp assets were not found. Expected assets/vendor/node_modules/sharp to be bundled with the extension.",
  );
}

function getSharp(): SharpModule {
  if (!cachedSharp) {
    cachedSharp = getVendoredSharpRequire()("sharp") as SharpModule;
  }

  return cachedSharp;
}

async function fetchBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function isUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function loadBuffer(source: string) {
  if (isUrl(source)) {
    return await fetchBuffer(source);
  }

  return await fs.readFile(source);
}

export async function loadJson<T>(source: string) {
  if (isUrl(source)) {
    const buffer = await fetchBuffer(source);
    return JSON.parse(buffer.toString("utf8")) as T;
  }

  return JSON.parse(await fs.readFile(source, "utf8")) as T;
}

function fileNameWithoutExtension(filePath: string) {
  return path.basename(filePath, path.extname(filePath));
}

function generateManifestId() {
  return crypto.randomUUID();
}

function generateSeedId() {
  const bytes = crypto.randomBytes(SEED_LENGTH);
  let seed = "";

  for (const byte of bytes) {
    seed += SEED_ALPHABET[byte % SEED_ALPHABET.length];
  }

  return seed;
}

function createRawImagePipeline(imageBuffer: Buffer, width: number, height: number) {
  return getSharp()(imageBuffer, {
    raw: {
      width,
      height,
      channels: RGBA_CHANNELS,
    },
  });
}

async function decodeImage(input: Buffer | string) {
  const image = getSharp()(input).ensureAlpha();
  const metadata = await image.metadata();
  const result = (await image.raw().toBuffer({ resolveWithObject: true })) as SharpToBufferResult;

  if (!result.info.width || !result.info.height) {
    throw new Error("Decoded image is missing dimensions");
  }

  return {
    imageBuffer: Buffer.from(result.data),
    width: result.info.width,
    height: result.info.height,
    format: metadata.format ?? result.info.format,
  };
}

async function encodePng(imageBuffer: Buffer, width: number, height: number) {
  return (await createRawImagePipeline(imageBuffer, width, height).png().toBuffer()) as Buffer;
}

async function loadImageBuffer(input: Buffer | string) {
  try {
    const image = await decodeImage(input);
    return {
      imageBuffer: image.imageBuffer,
      width: image.width,
      height: image.height,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to load image buffer: ${message}`);
  }
}

async function createPngFromImageBuffer(imageBuffer: Buffer, width: number, height: number) {
  try {
    return await encodePng(imageBuffer, width, height);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to create PNG from image buffer: ${message}`);
  }
}

export class ImageFragmenter {
  private config: BaseFragmentationConfig;

  constructor(config: FragmentationConfig) {
    this.config = {
      blockSize: config.blockSize ?? DEFAULT_FRAGMENTATION_CONFIG.BLOCK_SIZE,
      prefix: config.prefix ?? DEFAULT_FRAGMENTATION_CONFIG.PREFIX,
      seed: config.seed,
      preserveName: config.preserveName ?? DEFAULT_FRAGMENTATION_CONFIG.PRESERVE_NAME,
      crossImageShuffle: config.crossImageShuffle ?? DEFAULT_FRAGMENTATION_CONFIG.CROSS_IMAGE_SHUFFLE,
    };
  }

  async fragmentImages(paths: string[]) {
    const manifestId = generateManifestId();
    const config = {
      ...this.config,
      seed: this.config.seed ?? generateSeedId(),
    };

    const sources = await Promise.all(paths.map((filePath) => this.loadSourceImage(filePath)));
    const imageInfos = paths.map((filePath, index) => this.createImageInfo(filePath, sources[index].width, sources[index].height));

    validateFileNames(imageInfos, this.config.preserveName);

    const fragmentedBuffers = fragmentImageBuffers(sources, config);
    const fragmentedImages = await Promise.all(
      fragmentedBuffers.map((fragment) =>
        createPngFromImageBuffer(Buffer.from(fragment.buffer), fragment.width, fragment.height),
      ),
    );

    return {
      manifest: this.createManifest(manifestId, config, imageInfos),
      fragmentedImages,
    };
  }

  private createManifest(manifestId: string, config: Required<FragmentationConfig>, imageInfos: ImageInfo[]): ManifestData {
    return {
      id: manifestId,
      version: PIXZLE_NODE_VERSION,
      timestamp: new Date().toISOString(),
      config,
      images: imageInfos,
    };
  }

  private async loadSourceImage(filePath: string): Promise<ImageBufferData> {
    const buffer = await loadBuffer(filePath);
    const { imageBuffer, width, height } = await loadImageBuffer(buffer);

    return {
      buffer: imageBuffer,
      width,
      height,
    };
  }

  private createImageInfo(filePath: string, width: number, height: number): ImageInfo {
    return {
      w: width,
      h: height,
      name: this.config.preserveName ? encodeFileName(fileNameWithoutExtension(filePath)) : undefined,
    };
  }
}

export class ImageRestorer {
  async restoreImages(fragments: Array<Buffer | string>, manifest: ManifestData) {
    validateFragmentImageCount(fragments, manifest);

    const fragmentImages = await Promise.all(fragments.map((fragment) => this.loadFragment(fragment)));
    const restoredBuffers = restoreImageBuffers(fragmentImages, manifest);

    return await Promise.all(
      restoredBuffers.map((buffer, index) =>
        createPngFromImageBuffer(Buffer.from(buffer), manifest.images[index].w, manifest.images[index].h),
      ),
    );
  }

  private async loadFragment(fragment: Buffer | string): Promise<ImageBufferData> {
    const buffer = Buffer.isBuffer(fragment) ? fragment : await loadBuffer(fragment);
    const { imageBuffer, width, height } = await loadImageBuffer(buffer);
    return { buffer: imageBuffer, width, height };
  }
}
