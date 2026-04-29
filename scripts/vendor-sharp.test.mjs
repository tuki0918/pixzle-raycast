import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import { vendorSharpRuntime } from "./vendor-sharp.mjs";

const requiredPackages = [
  "sharp",
  "detect-libc",
  "semver",
  "@img/colour",
  "@img/sharp-darwin-arm64",
  "@img/sharp-libvips-darwin-arm64",
];

test("copies the required sharp runtime packages into assets/vendor", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "vendor-sharp-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  for (const packageName of requiredPackages) {
    const packageDir = join(root, "node_modules", packageName);
    await mkdir(packageDir, { recursive: true });
    await writeFile(join(packageDir, "package.json"), JSON.stringify({ name: packageName }));
  }

  await vendorSharpRuntime({ rootDir: root, log: () => {}, platform: "darwin", arch: "arm64" });

  for (const packageName of requiredPackages) {
    const vendoredPackage = join(root, "assets", "vendor", "node_modules", packageName, "package.json");
    assert.equal(JSON.parse(await readFile(vendoredPackage, "utf8")).name, packageName);
  }
});

test("fails with a clear error when a required package is missing", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "vendor-sharp-missing-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  await assert.rejects(
    () => vendorSharpRuntime({ rootDir: root, log: () => {} }),
    /Missing required package: node_modules\/sharp/,
  );

  await assert.rejects(stat(join(root, "assets", "vendor", "node_modules")));
});
