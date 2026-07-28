import { inflateRawSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

const GEONAMES = "https://download.geonames.org/export/dump";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing GeoNames."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function downloadText(name) {
  const response = await fetch(`${GEONAMES}/${name}`);
  if (!response.ok) throw new Error(`Could not download ${name}: ${response.status}`);
  return response.text();
}

async function downloadBytes(name) {
  const response = await fetch(`${GEONAMES}/${name}`);
  if (!response.ok) throw new Error(`Could not download ${name}: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// GeoNames city archives contain one deflated text file. Reading the first local
// ZIP entry avoids adding a runtime dependency solely for this maintenance script.
function unzipFirstFile(zip) {
  if (zip.readUInt32LE(0) !== 0x04034b50) throw new Error("Invalid ZIP archive");
  const flags = zip.readUInt16LE(6);
  const method = zip.readUInt16LE(8);
  const compressedSize = zip.readUInt32LE(18);
  const fileNameLength = zip.readUInt16LE(26);
  const extraLength = zip.readUInt16LE(28);
  if (flags & 0x08) {
    throw new Error("Unsupported ZIP data descriptor; update the importer.");
  }
  const start = 30 + fileNameLength + extraLength;
  const compressed = zip.subarray(start, start + compressedSize);
  if (method === 0) return compressed.toString("utf8");
  if (method === 8) return inflateRawSync(compressed).toString("utf8");
  throw new Error(`Unsupported ZIP compression method ${method}`);
}

function dataLines(text) {
  return text.split(/\r?\n/).filter((line) => line && !line.startsWith("#"));
}

async function upsertBatches(table, rows, onConflict, size = 1000) {
  for (let index = 0; index < rows.length; index += size) {
    const batch = rows.slice(index, index + size);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict, ignoreDuplicates: false });
    if (error) throw new Error(`${table} import failed: ${error.message}`);
    process.stdout.write(`\r${table}: ${Math.min(index + size, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");
}

const [countryText, regionText, cityZip] = await Promise.all([
  downloadText("countryInfo.txt"),
  downloadText("admin1CodesASCII.txt"),
  downloadBytes("cities500.zip"),
]);

const countries = dataLines(countryText).map((line) => {
  const columns = line.split("\t");
  return {
    country_code: columns[0],
    name: columns[4],
    phone_code: columns[12] || null,
    geoname_id: Number(columns[16]) || null,
    is_active: true,
  };
});

const regions = dataLines(regionText).map((line) => {
  const columns = line.split("\t");
  const [countryCode, ...regionParts] = columns[0].split(".");
  return {
    geoname_id: Number(columns[3]),
    country_code: countryCode,
    region_code: regionParts.join("."),
    name: columns[1],
    ascii_name: columns[2] || null,
    is_active: true,
  };
});

const cities = dataLines(unzipFirstFile(cityZip)).map((line) => {
  const columns = line.split("\t");
  return {
    geoname_id: Number(columns[0]),
    name: columns[1],
    ascii_name: columns[2] || null,
    alternative_names: columns[3] ? columns[3].split(",").slice(0, 100) : [],
    latitude: Number(columns[4]) || null,
    longitude: Number(columns[5]) || null,
    country_code: columns[8],
    region_code: columns[10] || null,
    population: Number(columns[14]) || 0,
    is_active: true,
  };
});

await upsertBatches("reference_countries", countries, "country_code");
await upsertBatches("reference_regions", regions, "geoname_id");
await upsertBatches("reference_cities", cities, "geoname_id");

console.log(
  `GeoNames import complete: ${countries.length} countries, ${regions.length} regions, ${cities.length} cities.`
);
