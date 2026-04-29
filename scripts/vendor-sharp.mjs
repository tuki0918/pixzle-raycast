import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

function getRequiredPackages({ platform = process.platform, arch = process.arch } = {}) {
  const platformArch = `${platform}-${arch}`;

  return [
    "sharp",
    "detect-libc",
    "semver",
    "@img/colour",
    `@img/sharp-${platformArch}`,
    `@img/sharp-libvips-${platformArch}`,
  ];
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

export async function vendorSharpRuntime({
  rootDir = process.cwd(),
  log = console.log,
  platform = process.platform,
  arch = process.arch,
} = {}) {
  const vendorNodeModules = join(rootDir, "assets", "vendor", "node_modules");
  const copyPlan = getRequiredPackages({ platform, arch }).map((packageName) => ({
    packageName,
    source: join(rootDir, "node_modules", packageName),
    target: join(vendorNodeModules, packageName),
  }));

  for (const { source, packageName } of copyPlan) {
    if (!(await pathExists(source))) {
      throw new Error(`Missing required package: node_modules/${packageName}. Run npm install first.`);
    }
  }

  await mkdir(join(vendorNodeModules, "@img"), { recursive: true });

  for (const { source, target, packageName } of copyPlan) {
    await rm(target, { recursive: true, force: true });
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target, { recursive: true });
    log(`Vendored ${packageName}`);
  }
}

const invokedFile = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";

if (import.meta.url === invokedFile) {
  try {
    await vendorSharpRuntime();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
