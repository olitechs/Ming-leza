import { describe, expect, it } from "vitest";
import { createCityPopupContent } from "./city-popup-content";

const cluster = {
  city: "Nairobi",
  region: "Nairobi County",
  country_code: "KE",
  online_count: 1_248,
};

describe("city cluster popup content", () => {
  it("shows the aggregate count, location, cluster threshold, and map precision", () => {
    const popup = createCityPopupContent(cluster, document);

    expect(popup.getAttribute("aria-label")).toBe("Anonymous city-cluster stats for Nairobi");
    expect(popup.querySelector(".mingleza-city-popup__count")?.textContent).toBe("1,248");
    expect(popup.querySelector(".mingleza-city-popup__location")?.textContent).toBe(
      "Nairobi County, KE",
    );
    expect(popup.textContent).toContain("3+ members");
    expect(popup.textContent).toContain("City centre only");
    expect(popup.textContent).toContain("About 30 seconds while visible");
  });

  it("uses text nodes for city labels and states that individuals and GPS are not shown", () => {
    const popup = createCityPopupContent(
      { ...cluster, city: "<img src=x onerror=alert(1)>" },
      document,
    );

    expect(popup.querySelector("img")).toBeNull();
    expect(popup.querySelector(".mingleza-city-popup__title")?.textContent).toBe(
      "<img src=x onerror=alert(1)>",
    );
    expect(popup.textContent).toContain("Individual profiles and GPS locations are never shown.");
  });
});
