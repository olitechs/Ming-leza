import type { CityCluster } from "./city-centroids";

function createTextElement(
  documentRef: Document,
  tagName: keyof HTMLElementTagNameMap,
  className: string,
  text: string,
): HTMLElement {
  const element = documentRef.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

export function createCityPopupContent(
  cluster: CityCluster,
  documentRef: Document = document,
): HTMLElement {
  const popup = documentRef.createElement("section");
  popup.className = "mingleza-city-popup";
  popup.setAttribute("role", "group");
  popup.setAttribute("aria-label", `Anonymous city-cluster stats for ${cluster.city}`);

  const header = documentRef.createElement("div");
  header.className = "mingleza-city-popup__header";
  const status = documentRef.createElement("span");
  status.className = "mingleza-city-popup__status";
  status.setAttribute("aria-hidden", "true");
  const statusText = createTextElement(
    documentRef,
    "span",
    "mingleza-city-popup__eyebrow",
    "LIVE CITY CLUSTER",
  );
  header.append(status, statusText);

  const title = createTextElement(documentRef, "h3", "mingleza-city-popup__title", cluster.city);
  const location = createTextElement(
    documentRef,
    "p",
    "mingleza-city-popup__location",
    [cluster.region, cluster.country_code].filter(Boolean).join(", "),
  );

  const mainStat = documentRef.createElement("div");
  mainStat.className = "mingleza-city-popup__main-stat";
  const count = createTextElement(
    documentRef,
    "strong",
    "mingleza-city-popup__count",
    new Intl.NumberFormat("en").format(cluster.online_count),
  );
  const countLabel = createTextElement(
    documentRef,
    "span",
    "mingleza-city-popup__count-label",
    "opted-in adults online",
  );
  mainStat.append(count, countLabel);

  const details = documentRef.createElement("dl");
  details.className = "mingleza-city-popup__details";
  const detailRows = [
    ["Cluster threshold", "3+ members"],
    ["Map precision", "City centre only"],
    ["Refresh cadence", "About 30 seconds while visible"],
  ] as const;
  for (const [label, value] of detailRows) {
    const row = documentRef.createElement("div");
    row.className = "mingleza-city-popup__detail-row";
    row.append(
      createTextElement(documentRef, "dt", "mingleza-city-popup__detail-label", label),
      createTextElement(documentRef, "dd", "mingleza-city-popup__detail-value", value),
    );
    details.append(row);
  }

  const privacy = createTextElement(
    documentRef,
    "p",
    "mingleza-city-popup__privacy",
    "Anonymous aggregate only. Individual profiles and GPS locations are never shown.",
  );
  popup.append(header, title, location, mainStat, details, privacy);
  return popup;
}
