const FOLCA_WEBSITE_URL = "https://www.folcatn.org";
const FOLCA_DONATION_URL = "https://www.folcatn.org/give";

const state = {
  data: null,
  records: [],
  query: "",
  currentOnly: true
};

const elements = {
  currentOnly: document.querySelector("#currentOnly"),
  donateLink: document.querySelector("#donateLink"),
  emptyState: document.querySelector("#emptyState"),
  folcaLink: document.querySelector("#folcaLink"),
  lawLink: document.querySelector("#lawLink"),
  resultCount: document.querySelector("#resultCount"),
  resultsList: document.querySelector("#resultsList"),
  searchInput: document.querySelector("#searchInput"),
  sourceDisclaimer: document.querySelector("#sourceDisclaimer"),
  sourceLink: document.querySelector("#sourceLink"),
  syncStatus: document.querySelector("#syncStatus"),
  template: document.querySelector("#recordTemplate")
};

function configureLinks() {
  setOptionalLink(elements.folcaLink, FOLCA_WEBSITE_URL);
  setOptionalLink(elements.donateLink, FOLCA_DONATION_URL);
}

function setOptionalLink(element, url) {
  if (!url || url === "#") {
    element.hidden = true;
    element.removeAttribute("href");
    return;
  }

  element.hidden = false;
  element.href = url;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dateDisplay(value, fallback) {
  if (!value) return fallback || "N/A";
  const [year, month, day] = value.split("-");
  return `${Number(month)}-${Number(day)}-${year}`;
}

function isCurrent(record) {
  if (!record.expirationDate) return true;
  const today = new Date();
  const end = new Date(`${record.expirationDate}T23:59:59`);
  return end >= today;
}

function matchesQuery(record, query) {
  if (!query) return true;

  const haystack = normalize([
    record.name,
    record.dob,
    record.address,
    record.countyOfConviction,
    record.offense,
    record.convictionDateDisplay,
    record.expirationDateDisplay
  ].join(" "));

  return normalize(query)
    .split(" ")
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function getFilteredRecords() {
  return state.records.filter((record) => {
    if (state.currentOnly && !isCurrent(record)) return false;
    return matchesQuery(record, state.query);
  });
}

function render() {
  const filtered = getFilteredRecords();
  elements.resultsList.replaceChildren();

  elements.resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`;
  elements.emptyState.hidden = filtered.length !== 0;

  const fragment = document.createDocumentFragment();
  for (const record of filtered) {
    fragment.appendChild(renderRecord(record));
  }
  elements.resultsList.appendChild(fragment);
}

function renderRecord(record) {
  const node = elements.template.content.firstElementChild.cloneNode(true);
  const photo = node.querySelector(".record-photo");
  const status = node.querySelector(".status");

  node.querySelector("h3").textContent = record.name;
  photo.src = record.imageUrl || "";
  photo.alt = record.imageAlt || `Picture of ${record.name}`;
  photo.hidden = !record.imageUrl;

  status.textContent = isCurrent(record) ? "Current" : "Expired";
  status.classList.toggle("expired", !isCurrent(record));

  node.querySelector('[data-field="dob"]').textContent = record.dob || "N/A";
  node.querySelector('[data-field="county"]').textContent = record.countyOfConviction || "N/A";
  node.querySelector('[data-field="offense"]').textContent = record.offense || "N/A";
  node.querySelector('[data-field="conviction"]').textContent = dateDisplay(
    record.convictionDate,
    record.convictionDateDisplay
  );
  node.querySelector('[data-field="expiration"]').textContent = dateDisplay(
    record.expirationDate,
    record.expirationDateDisplay
  );
  node.querySelector('[data-field="address"]').textContent = record.address || "N/A";

  return node;
}

async function loadRegistry() {
  const response = await fetch("./registry.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load registry.json: HTTP ${response.status}`);
  }

  state.data = await response.json();
  state.records = state.data.records ?? [];

  elements.sourceDisclaimer.textContent = state.data.sourceDisclaimer;
  elements.sourceLink.href = state.data.sourceUrl;
  elements.lawLink.href = state.data.lawUrl;
  elements.syncStatus.textContent = `Last synced ${new Date(
    state.data.generatedAt
  ).toLocaleString()} from ${state.data.recordCount} official TBI records.`;

  render();
}

configureLinks();

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

elements.currentOnly.addEventListener("change", (event) => {
  state.currentOnly = event.target.checked;
  render();
});

loadRegistry().catch((error) => {
  elements.syncStatus.textContent =
    "The registry data could not be loaded. Please try again later or use the official TBI registry link.";
  elements.emptyState.hidden = false;
  elements.emptyState.textContent = error.message;
});
