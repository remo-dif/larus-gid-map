import fs from "fs";
import path from "path";
import https from "https";
import { execSync } from "child_process";

const WORLD_FILE = "./public/ne_10m_admin_0_countries_comp15.geojson";
const LEVEL1_DIR = "./public/level1";
const OUTPUT_DIR = "./public/level2";
const TEMP_DIR = "./public/tmp_gid2";
const GADM_BASE = "https://geodata.ucdavis.edu/gadm/gadm4.1/json";

const args = process.argv.slice(2);
const getArgValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const ONLY_COUNTRY = getArgValue("--country")?.toUpperCase();
const ONLY_GID1 = getArgValue("--gid1");

const download = (url, filePath) => {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          console.log(`Missing: ${url}`);
          resolve(false);
          return;
        }

        const file = fs.createWriteStream(filePath);
        res.pipe(file);

        file.on("finish", () => {
          file.close();
          console.log(`Downloaded: ${filePath}`);
          resolve(true);
        });
      })
      .on("error", () => {
        console.log(`Error: ${url}`);
        resolve(false);
      });
  });
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const safeUnlink = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf-8"));

const getIsoMap = () => {
  const world = readJson(WORLD_FILE);
  const isoMap = {};

  world.features.forEach((feature) => {
    const iso3 = feature.properties?.ISO_A3;
    const iso2 = feature.properties?.ISO_A2;

    if (iso3 && iso3 !== "-99" && iso2 && iso2 !== "-99") {
      isoMap[iso2] = iso3;
    }
  });

  return isoMap;
};

const getLevel1Items = () => {
  const items = [];

  fs.readdirSync(LEVEL1_DIR)
    .filter((fileName) => fileName.endsWith(".geojson"))
    .forEach((fileName) => {
      const iso2 = path.basename(fileName, ".geojson");
      const geoJson = readJson(path.join(LEVEL1_DIR, fileName));

      geoJson.features.forEach((feature) => {
        const gid1 = feature.properties?.GID_1;

        if (gid1) {
          items.push({
            gid1,
            iso2,
            name1: feature.properties?.NAME_1 || null,
          });
        }
      });
    });

  return items;
};

const normalizeLevel2Features = (gadm, gid1, fallbackName1) => {
  return gadm.features
    .filter((feature) => feature.properties?.GID_1 === gid1)
    .map((feature) => ({
      type: "Feature",
      geometry: feature.geometry,
      properties: {
        GID_0: feature.properties?.GID_0 || null,
        GID_1: gid1,
        GID_2: feature.properties?.GID_2 || null,
        NAME_1: feature.properties?.NAME_1 || fallbackName1,
        NAME_2: feature.properties?.NAME_2 || null,
      },
    }))
    .filter((feature) => feature.properties.GID_2);
};

const optimizeGeoJson = (inputPath, outputPath) => {
  const quote = (value) => `"${value.replaceAll('"', '\\"')}"`;

  execSync(
    `mapshaper ${quote(inputPath)} -simplify 10% keep-shapes -o format=geojson ${quote(outputPath)}`,
    { stdio: "inherit" },
  );
};

const run = async () => {
  [OUTPUT_DIR, TEMP_DIR].forEach(ensureDir);

  const isoMap = getIsoMap();
  const level1Items = getLevel1Items()
    .filter((item) => !ONLY_COUNTRY || item.iso2 === ONLY_COUNTRY)
    .filter((item) => !ONLY_GID1 || item.gid1 === ONLY_GID1);
  const itemsByIso2 = new Map();
  const missing = [];

  if (level1Items.length === 0) {
    console.log("No GID_1 entries match the selected filters");
    return;
  }

  level1Items.forEach((item) => {
    itemsByIso2.set(item.iso2, [...(itemsByIso2.get(item.iso2) || []), item]);
  });

  console.log(`Found ${level1Items.length} GID_1 entries`);

  for (const [iso2, items] of itemsByIso2.entries()) {
    const iso3 = isoMap[iso2];

    if (!iso3) {
      console.warn(`Missing ISO3 mapping for ${iso2}`);
      items.forEach((item) => missing.push(item.gid1));
      continue;
    }

    const downloadPath = path.join(TEMP_DIR, `${iso2}_level2.json`);
    const url = `${GADM_BASE}/gadm41_${iso3}_2.json`;
    const ok = await download(url, downloadPath);

    if (!ok) {
      items.forEach((item) => missing.push(item.gid1));
      continue;
    }

    const gadm = readJson(downloadPath);

    for (const item of items) {
      const finalPath = path.join(OUTPUT_DIR, `${item.gid1}.geojson`);
      const cleanPath = path.join(TEMP_DIR, `${item.gid1}.json`);

      if (fs.existsSync(finalPath)) {
        console.log(`Skip ${item.gid1}`);
        continue;
      }

      const features = normalizeLevel2Features(gadm, item.gid1, item.name1);

      if (features.length === 0) {
        console.log(`No GID_2 found for ${item.gid1}`);
        missing.push(item.gid1);
        continue;
      }

      fs.writeFileSync(
        cleanPath,
        JSON.stringify({
          type: "FeatureCollection",
          features,
        }),
      );

      try {
        optimizeGeoJson(cleanPath, finalPath);
        console.log(`Optimized: ${finalPath}`);
      } catch {
        console.log(`Error optimizing ${item.gid1}`);
        missing.push(item.gid1);
      } finally {
        safeUnlink(cleanPath);
      }
    }

    safeUnlink(downloadPath);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, "missing.json"), JSON.stringify(missing, null, 2));

  console.log("\nDONE");
  console.log(`Missing: ${missing.length}`);
};

run();
