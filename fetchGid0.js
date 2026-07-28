import fs from "fs";
import path from "path";
import https from "https";
import { execSync } from "child_process";

// === CONFIG ===
const WORLD_FILE = "./public/ne_10m_admin_0_countries_comp15.geojson";
const OUTPUT_DIR = "./public/countries";
const TEMP_DIR = "./public/tmp_countries";
const GADM_BASE = "https://geodata.ucdavis.edu/gadm/gadm4.1/json";

// === DOWNLOAD ===
const download = (url, filePath) => {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.log(`Missing: ${url}`);
        resolve(false);
        return;
      }

      const file = fs.createWriteStream(filePath);
      res.pipe(file);

      file.on("finish", () => {
        file.close();
        console.log(`⬇ Downloaded: ${filePath}`);
        resolve(true);
      });
    }).on("error", () => {
      console.log(`Error: ${url}`);
      resolve(false);
    });
  });
};

// === MAIN ===
const run = async () => {
  // crea cartelle
  [OUTPUT_DIR, TEMP_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const world = JSON.parse(fs.readFileSync(WORLD_FILE, "utf-8"));

  // === LOOKUP METADATA ===
  const countryLookup = {};
  world.features.forEach((f) => {
    const iso3 = f.properties.ISO_A3;
    if (!iso3 || iso3 === "-99") return;

    countryLookup[iso3] = {
      ISO_A2: f.properties.ISO_A2,
      ISO_A3: iso3,
      NAME_EN: f.properties.NAME || f.properties.ADMIN,
      NAME_IT: f.properties.NAME_IT || f.properties.NAME
    };
  });

  const isoList = [...new Set(world.features.map(f => f.properties.ISO_A3))]
    .filter(i => i && i !== "-99");

  console.log(`Found ${isoList.length} countries`);

  const missing = [];

  for (const iso3 of isoList) {
    const meta = countryLookup[iso3];
    const iso2 = meta?.ISO_A2 || iso3;

    const countryDir = path.join(OUTPUT_DIR, iso2);
    const tempPath = path.join(TEMP_DIR, `${iso2}.json`);
    const cleanPath = path.join(TEMP_DIR, `${iso2}_clean.json`);
    const finalPath = path.join(countryDir, `${iso2}.geojson`);

    // skip se già fatto
    if (fs.existsSync(finalPath)) {
      console.log(`Skip ${iso2}`);
      continue;
    }

    if (!fs.existsSync(countryDir)) {
      fs.mkdirSync(countryDir, { recursive: true });
    }

    const url = `${GADM_BASE}/gadm41_${iso3}_0.json`;
    const ok = await download(url, tempPath);

    if (!ok) {
      missing.push(iso3);
      continue;
    }

    try {
      // === NORMALIZZA PROPERTIES ===
      const gadm = JSON.parse(fs.readFileSync(tempPath, "utf-8"));

      const cleanFeatures = gadm.features.map(f => ({
        type: "Feature",
        geometry: f.geometry,
        properties: {
          GID_0: iso3,
          ISO_A2: meta?.ISO_A2 || null,
          ISO_A3: iso3,
          NAME_EN: meta?.NAME_EN || null,
          NAME_IT: meta?.NAME_IT || null
        }
      }));

      fs.writeFileSync(
        cleanPath,
        JSON.stringify({
          type: "FeatureCollection",
          features: cleanFeatures
        })
      );

      // === COMPRESSIONE ===
      execSync(`
        mapshaper ${cleanPath} \
        -simplify 10% keep-shapes \
        -o ${finalPath}
      `);

      console.log(`Optimized: ${iso2}`);

      // cleanup
      fs.unlinkSync(tempPath);
      fs.unlinkSync(cleanPath);

    } catch {
      console.log(`Error processing ${iso2}`);
    }
  }

  // salva missing
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "missing.json"),
    JSON.stringify(missing, null, 2)
  );

  console.log("\nDONE");
  console.log(`Missing: ${missing}`);

  const worldFeatures = [];

// leggi tutti i file generati
const countryDirs = fs.readdirSync(OUTPUT_DIR);

for (const iso2 of countryDirs) {
  const filePath = path.join(OUTPUT_DIR, iso2, `${iso2}.geojson`);

  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  data.features.forEach(f => {
    worldFeatures.push(f);
  });
}

// salva merged RAW
const mergedRawPath = path.join(TEMP_DIR, "world_raw.geojson");

fs.writeFileSync(
  mergedRawPath,
  JSON.stringify({
    type: "FeatureCollection",
    features: worldFeatures
  })
);

console.log(`🌍 Merged raw countries: ${worldFeatures.length}`);
};

run();