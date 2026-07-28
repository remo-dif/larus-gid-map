import fs from "fs";
import path from "path";
import https from "https";
import { execSync } from "child_process";

// === CONFIG ===
const WORLD_FILE = "./public/ne_10m_admin_0_countries_comp15.geojson";
const OUTPUT_DIR = "./public/regions";
const TEMP_DIR = "./tmp_regions";
const GADM_BASE = "https://geodata.ucdavis.edu/gadm/gadm4.1/json";

// === DOWNLOAD ===
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
          console.log(`⬇Downloaded: ${filePath}`);
          resolve(true);
        });
      })
      .on("error", () => {
        console.log(`Error: ${url}`);
        resolve(false);
      });
  });
};

// === MAIN ===
const run = async () => {
  // crea cartelle base
  [OUTPUT_DIR, TEMP_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const world = JSON.parse(fs.readFileSync(WORLD_FILE, "utf-8"));

  // === MAP ISO3 → ISO2 ===
  const isoMap = {};
  world.features.forEach((f) => {
    const iso3 = f.properties.ISO_A3;
    const iso2 = f.properties.ISO_A2;

    if (iso3 && iso2 && iso2 !== "-99") {
      isoMap[iso3] = iso2;
    }
  });

  const isoList = [...new Set(world.features.map(f => f.properties.ISO_A3))]
    .filter(i => i && i !== "-99");

  console.log(`Found ${isoList.length} countries`);

  const missing = [];

  for (const iso3 of isoList) {
    const iso2 = isoMap[iso3] || iso3;

    if (!isoMap[iso3]) {
      console.warn(`Missing ISO2 mapping for ${iso3}`);
    }

    const url = `${GADM_BASE}/gadm41_${iso3}_1.json`;

    // === PATHS ===
    const countryDir = path.join(OUTPUT_DIR, iso2);
    const tempPath = path.join(TEMP_DIR, `${iso2}.json`);
    const finalPath = path.join(countryDir, `${iso2}.geojson`);

    // crea cartella paese
    if (!fs.existsSync(countryDir)) {
      fs.mkdirSync(countryDir, { recursive: true });
    }

    const ok = await download(url, tempPath);

    if (!ok) {
      missing.push(iso3);
      continue;
    }

    try {
      // COMPRESSIONE AUTOMATICA
      execSync(`
        mapshaper ${tempPath} \
        -merge-layers target=*
        -simplify 10% keep-shapes \
        -o ${finalPath}
      `);

      console.log(`⚡ Optimized: ${finalPath}`);

      // cleanup temp
      fs.unlinkSync(tempPath);

    } catch (err) {
      console.log(`Error optimizing ${iso2}`);
    }
  }

  // salva missing
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "missing.json"),
    JSON.stringify(missing, null, 2)
  );

  console.log("\nDONE");
  console.log(`Missing: ${missing.length}`);
};

run();