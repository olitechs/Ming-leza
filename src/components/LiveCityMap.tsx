import { useEffect, useId, useRef, useState } from "react";
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  Popup as MapLibrePopup,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  findCityCentroid,
  parseCityCentroids,
  type CityCentroidRecord,
  type CityCluster,
} from "@/lib/maps/city-centroids";
import { createCityPopupContent, createCityTooltipContent } from "@/lib/maps/city-popup-content";

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function LiveCityMap({ clusters }: { clusters: CityCluster[] }) {
  const tooltipIdPrefix = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const maplibreRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const tooltipsRef = useRef<MapLibrePopup[]>([]);
  const [centroids, setCentroids] = useState<CityCentroidRecord[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [unmappedCount, setUnmappedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;

    const initializeMap = async () => {
      try {
        const [maplibre, worker, datasetResponse] = await Promise.all([
          import("maplibre-gl"),
          import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"),
          fetch("/data/city-centroids.json", { cache: "force-cache" }),
        ]);
        if (!datasetResponse.ok) throw new Error("City-centre data could not be loaded.");
        const dataset = parseCityCentroids(await datasetResponse.json());
        if (cancelled || !containerRef.current) return;
        if (dataset.length === 0) throw new Error("City-centre data is unavailable.");

        maplibre.setWorkerUrl(worker.default);
        maplibreRef.current = maplibre;
        setCentroids(dataset);
        map = new maplibre.Map({
          container: containerRef.current,
          style: OPENFREEMAP_STYLE,
          center: [25, 4],
          zoom: 1.7,
          cooperativeGestures: true,
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;
        map.once("load", () => {
          if (!cancelled) setMapReady(true);
        });
      } catch {
        if (!cancelled) {
          setMapError("The interactive map could not load. City counts remain available below.");
        }
      }
    };

    void initializeMap();
    return () => {
      cancelled = true;
      tooltipsRef.current.forEach((tooltip) => tooltip.remove());
      tooltipsRef.current = [];
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
      maplibreRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!map || !maplibre || !mapReady || centroids.length === 0) return;

    tooltipsRef.current.forEach((tooltip) => tooltip.remove());
    tooltipsRef.current = [];
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const locations: [number, number][] = [];
    for (const [index, cluster] of clusters.entries()) {
      const point = findCityCentroid(cluster, centroids);
      if (!point) continue;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "mingleza-city-marker";
      button.textContent = "3+";
      button.setAttribute(
        "aria-label",
        `${cluster.city}: ${cluster.online_count} opted-in adults online. Focus or click for city stats.`,
      );
      const tooltipId = `${tooltipIdPrefix}-cluster-tooltip-${index}`;
      button.setAttribute("aria-describedby", tooltipId);

      const popupContent = createCityPopupContent(cluster);
      const clickPopup = new maplibre.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: "288px",
      }).setDOMContent(popupContent);
      const tooltip = new maplibre.Popup({
        closeButton: false,
        closeOnClick: false,
        closeOnMove: false,
        maxWidth: "240px",
        offset: 14,
      })
        .setLngLat([point.longitude, point.latitude])
        .setDOMContent(createCityTooltipContent(cluster, tooltipId));
      const showTooltip = () => {
        if (!clickPopup.isOpen()) tooltip.addTo(map);
      };
      const hideTooltip = () => tooltip.remove();
      button.addEventListener("mouseenter", showTooltip);
      button.addEventListener("mouseleave", hideTooltip);
      button.addEventListener("focus", showTooltip);
      button.addEventListener("blur", hideTooltip);
      button.addEventListener("click", hideTooltip);

      const marker = new maplibre.Marker({ element: button, anchor: "center" })
        .setLngLat([point.longitude, point.latitude])
        .setPopup(clickPopup)
        .addTo(map);
      markersRef.current.push(marker);
      tooltipsRef.current.push(tooltip);
      locations.push([point.longitude, point.latitude]);
    }

    setUnmappedCount(clusters.length - locations.length);
    if (locations.length === 1) {
      const onlyLocation = locations[0];
      if (onlyLocation) map.flyTo({ center: onlyLocation, zoom: 5, duration: 0 });
    } else if (locations.length > 1) {
      const bounds = new maplibre.LngLatBounds();
      locations.forEach((location) => bounds.extend(location));
      map.fitBounds(bounds, { padding: 52, maxZoom: 5, duration: 0 });
    }
  }, [clusters, centroids, mapReady, tooltipIdPrefix]);

  return (
    <div className="mt-5">
      <div
        ref={containerRef}
        className="mingleza-city-map h-[22rem] w-full overflow-hidden rounded-2xl border bg-secondary/40 sm:h-[27rem]"
        role="region"
        aria-label="Interactive map of anonymous city-level online clusters"
        aria-busy={!mapReady && !mapError}
      />
      {mapError ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {mapError}
        </p>
      ) : !mapReady ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Loading map and city-centre data…
        </p>
      ) : unmappedCount > 0 ? (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          {unmappedCount} city cluster{unmappedCount === 1 ? "" : "s"} remain in the list below
          because a safe city-centre match was unavailable.
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        City-centre coordinates ©{" "}
        <a
          href="https://www.geonames.org/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          GeoNames
        </a>{" "}
        (CC BY 4.0). Map attribution is shown on the map.
      </p>
    </div>
  );
}
