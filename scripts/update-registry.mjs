import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import https from "node:https";

const SOURCE_URL = "https://www.tn.gov/tbi/tennessee-animal-abuse-registry.html";
const LAW_URL =
  "https://www.tn.gov/content/dam/tn/tbi/documents/PC0413_-_Tennessee_Animal_Abuser_Registration_Act.pdf";
const OUTPUT_PATH = resolve("public", "registry.json");

function fetchText(url, attempt = 1) {
  return new Promise((resolvePromise, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "user-agent":
            "tn-animal-registry-search/0.1 nonprofit public-interest search tool",
          accept: "text/html,application/xhtml+xml"
        },
        timeout: 30000
      },
      (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          resolvePromise(fetchText(new URL(response.headers.location, url).toString()));
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Request failed with HTTP ${response.statusCode}`));
          return;
        }

        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolvePromise(body));
      }
    );

    request.on("timeout", () => request.destroy(new Error("Request timed out")));
    request.on("error", (error) => {
      if (attempt < 3) {
        setTimeout(() => {
          resolvePromise(fetchText(url, attempt + 1));
        }, attempt * 1500);
        return;
      }
      reject(error);
    });
  });
}

function decodeHtml(value = "") {
  const entities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
    rsquo: "'",
    lsquo: "'",
    rdquo: "\"",
    ldquo: "\""
  };

  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (_, name) => entities[name.toLowerCase()] ?? `&${name};`)
    .replace(/\u200b/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function htmlToText(html) {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{2,}/g, "\n")
  );
}

function field(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escaped}\\s*:\\s*([^\\n]+)`, "i"));
  return match ? decodeHtml(match[1]) : "";
}

function normalizeDate(value) {
  const cleaned = decodeHtml(value).trim();
  if (!cleaned || /^n\/?a$/i.test(cleaned)) return null;

  const match = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += year >= 70 ? 1900 : 2000;

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function toAbsoluteUrl(url) {
  if (!url) return "";
  return new URL(decodeHtml(url), SOURCE_URL).toString();
}

function recordId(record) {
  return [
    record.name,
    record.dob,
    record.countyOfConviction,
    record.convictionDate,
    record.offense
  ]
    .join("|")
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, "-");
}

function lastNameKey(name) {
  const suffixes = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);
  const parts = decodeHtml(name)
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z]/gi, "").toLowerCase())
    .filter(Boolean);

  while (parts.length > 1 && suffixes.has(parts.at(-1))) {
    parts.pop();
  }

  return parts.at(-1) ?? "";
}

function parseRegistry(html) {
  const chunks = html.split(/<div class="tn-textandimage textimage parbase">/i).slice(1);

  const records = chunks
    .map((chunk) => {
      const section = chunk.split(/<div class="tn-rte">|<footer|<\/article>/i)[0];
      const text = htmlToText(section);
      const name = field(text, "NAME");
      if (!name) return null;

      const imageMatch = section.match(/<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?/i);
      const convictionDateRaw = field(text, "CONVICTION DATE");
      const expirationDateRaw = field(text, "EXPIRATION DATE");

      const record = {
        id: "",
        name,
        dob: field(text, "DOB"),
        address: field(text, "ADDRESS"),
        countyOfConviction: field(text, "COUNTY OF CONVICTION"),
        offense: field(text, "OFFENSE"),
        convictionDate: normalizeDate(convictionDateRaw),
        convictionDateDisplay: convictionDateRaw,
        expirationDate: normalizeDate(expirationDateRaw),
        expirationDateDisplay: expirationDateRaw,
        imageUrl: toAbsoluteUrl(imageMatch?.[1] ?? ""),
        imageAlt: decodeHtml(imageMatch?.[2] ?? `Picture of ${name}`),
        sourceUrl: SOURCE_URL
      };

      record.id = recordId(record);
      return record;
    })
    .filter(Boolean);

  const uniqueRecords = Array.from(new Map(records.map((item) => [item.id, item])).values());
  uniqueRecords.sort((a, b) => {
    const lastNameCompare = lastNameKey(a.name).localeCompare(lastNameKey(b.name), "en");
    if (lastNameCompare !== 0) return lastNameCompare;
    return a.name.localeCompare(b.name, "en");
  });
  return uniqueRecords;
}

const html = await fetchText(SOURCE_URL);
const records = parseRegistry(html);

if (records.length === 0) {
  throw new Error("No registry records were parsed. The TBI page layout may have changed.");
}

const payload = {
  generatedAt: new Date().toISOString(),
  sourceUrl: SOURCE_URL,
  lawUrl: LAW_URL,
  sourceDisclaimer:
    "The information contained in the registry is provided to the Tennessee Bureau of Investigation by the appropriate clerk in each county. The TBI does not independently verify the convictions, and cannot guarantee their accuracy. Therefore, this information should be regarded as a resource suggesting the need for further inquiry.",
  recordCount: records.length,
  records
};

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${records.length} registry records to ${OUTPUT_PATH}`);
