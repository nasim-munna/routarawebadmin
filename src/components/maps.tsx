"use client";

import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { initials } from "@/lib/format";
import type { LivePosition, Snapshot } from "@/lib/types";

export type MapLayer = "streets" | "satellite";

// The bundler can't resolve MapLibre's own worker path, so it's served from
// public/ (copied there by scripts/copy-map-worker.mjs on install).
maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

const DHAKA: [number, number] = [90.4125, 23.8103];

const satellite: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Imagery © Esri",
    },
  },
  layers: [{ id: "imagery", type: "raster", source: "imagery" }],
};

function styleFor(layer: MapLayer, dark: boolean) {
  if (layer === "satellite") return satellite;
  return `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`;
}

function useMap(layer: MapLayer) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const applied = useRef<string>("");

  useEffect(() => {
    if (!container.current) return;
    const instance = new maplibregl.Map({
      container: container.current,
      style: styleFor(layer, dark),
      center: DHAKA,
      zoom: 6.4,
      attributionControl: { compact: true },
    });
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.current = instance;
    applied.current = `${layer}-${dark}`;
    return () => {
      instance.remove();
      map.current = null;
    };
    // Created once; style changes are handled below without rebuilding it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const key = `${layer}-${dark}`;
    if (map.current && applied.current !== key) {
      applied.current = key;
      map.current.setStyle(styleFor(layer, dark));
    }
  }, [layer, dark]);

  return { container, map };
}

type LiveMapProps = {
  positions: LivePosition[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  layer: MapLayer;
};

export default function LiveMap({ positions, selectedId, onSelect, layer }: LiveMapProps) {
  const { container, map } = useMap(layer);
  const markers = useRef(new Map<number, { marker: maplibregl.Marker; element: HTMLButtonElement }>());
  const fitted = useRef(false);
  const select = useRef(onSelect);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  // Pins belong to one map instance, so they go when it does.
  useEffect(() => {
    const pins = markers.current;
    return () => {
      pins.forEach(({ marker }) => marker.remove());
      pins.clear();
      fitted.current = false;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    const seen = new Set<number>();
    for (const person of positions) {
      seen.add(person.userId);
      let entry = markers.current.get(person.userId);

      if (!entry) {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "pin";
        element.textContent = initials(person.name);
        element.setAttribute("aria-label", person.name);
        element.title = person.name;
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          select.current(person.userId);
        });
        const marker = new maplibregl.Marker({ element }).setLngLat([person.longitude, person.latitude]).addTo(instance);
        entry = { marker, element };
        markers.current.set(person.userId, entry);
      }

      entry.marker.setLngLat([person.longitude, person.latitude]);
      entry.element.dataset.status = person.status ?? "OFFLINE";
      entry.element.dataset.selected = String(person.userId === selectedId);
    }

    for (const [id, entry] of markers.current) {
      if (!seen.has(id)) {
        entry.marker.remove();
        markers.current.delete(id);
      }
    }

    if (!fitted.current && positions.length) {
      fitted.current = true;
      const bounds = new maplibregl.LngLatBounds();
      positions.forEach((person) => bounds.extend([person.longitude, person.latitude]));
      instance.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 0 });
    }
  }, [positions, selectedId, map]);

  useEffect(() => {
    if (selectedId == null) return;
    const entry = markers.current.get(selectedId);
    if (entry) map.current?.flyTo({ center: entry.marker.getLngLat(), zoom: Math.max(map.current.getZoom(), 13) });
  }, [selectedId, map]);

  return <div ref={container} className="size-full" />;
}

function removeRoute(instance: maplibregl.Map) {
  if (instance.getLayer("route")) instance.removeLayer("route");
  if (instance.getSource("route")) instance.removeSource("route");
}

export function RouteMap({ points }: { points: Snapshot[] }) {
  const { container, map } = useMap("streets");

  useEffect(() => {
    const instance = map.current;
    if (!instance || points.length === 0) return;

    const line = points.map((point): [number, number] => [point.longitude, point.latitude]);
    const start = new maplibregl.Marker({ color: "#17845a" }).setLngLat(line[0]).addTo(instance);
    const end = new maplibregl.Marker({ color: "#c2384f" }).setLngLat(line[line.length - 1]).addTo(instance);

    const draw = () => {
      removeRoute(instance);
      instance.addSource("route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } },
      });
      instance.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#0b7a75", "line-width": 4 },
      });
    };

    // Runs on first load and again whenever a theme change swaps the style.
    instance.on("style.load", draw);
    if (instance.isStyleLoaded()) draw();

    const bounds = new maplibregl.LngLatBounds();
    line.forEach((point) => bounds.extend(point));
    instance.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 0 });

    return () => {
      instance.off("style.load", draw);
      start.remove();
      end.remove();
      if (instance.getStyle()) removeRoute(instance);
    };
  }, [points, map]);

  return <div ref={container} className="size-full" />;
}

export function StopsMap({ stops }: { stops: { id: number; name: string; latitude: number | null; longitude: number | null }[] }) {
  const { container, map } = useMap("streets");

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    const located = stops.filter((stop) => stop.latitude !== null && stop.longitude !== null);
    const line = located.map((stop): [number, number] => [stop.longitude!, stop.latitude!]);

    const markers = located.map((stop) => {
      const element = document.createElement("div");
      element.className = "stop";
      element.title = stop.name;
      element.textContent = String(stops.indexOf(stop) + 1);
      return new maplibregl.Marker({ element }).setLngLat([stop.longitude!, stop.latitude!]).addTo(instance);
    });

    const draw = () => {
      removeRoute(instance);
      if (line.length < 2) return;
      instance.addSource("route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } },
      });
      instance.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#0b7a75", "line-width": 3, "line-dasharray": [1, 2] },
      });
    };

    instance.on("style.load", draw);
    if (instance.isStyleLoaded()) draw();

    if (line.length) {
      const bounds = new maplibregl.LngLatBounds();
      line.forEach((point) => bounds.extend(point));
      instance.fitBounds(bounds, { padding: { top: 40, left: 40, right: 60, bottom: 90 }, maxZoom: 15, duration: 0 });
    }

    return () => {
      instance.off("style.load", draw);
      markers.forEach((marker) => marker.remove());
      if (instance.getStyle()) removeRoute(instance);
    };
  }, [stops, map]);

  return <div ref={container} className="size-full" />;
}

type Point = { latitude: number; longitude: number };

function circle(center: Point, radiusM: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const steps = 64;
  const latDegrees = radiusM / 111_320;
  const lngDegrees = latDegrees / Math.cos((center.latitude * Math.PI) / 180);
  const ring = Array.from({ length: steps + 1 }, (_, step): [number, number] => {
    const angle = (step / steps) * 2 * Math.PI;
    return [center.longitude + lngDegrees * Math.cos(angle), center.latitude + latDegrees * Math.sin(angle)];
  });
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

type PickMapProps = { value: Point | null; onChange: (point: Point) => void; radiusM?: number };

export function PickMap({ value, onChange, radiusM }: PickMapProps) {
  const { container, map } = useMap("streets");
  const marker = useRef<maplibregl.Marker | null>(null);
  const change = useRef(onChange);

  useEffect(() => {
    change.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const pick = (event: maplibregl.MapMouseEvent) => change.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    instance.on("click", pick);
    return () => {
      instance.off("click", pick);
    };
  }, [map]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !value) return;
    const center: [number, number] = [value.longitude, value.latitude];
    if (!marker.current) {
      // Moves in close after the first click, or on an existing outlet, so
      // the exact spot can then be chosen.
      marker.current = new maplibregl.Marker({ color: "#c2384f" }).setLngLat(center).addTo(instance);
      if (radiusM) {
        const bounds = new maplibregl.LngLatBounds();
        circle(value, radiusM).geometry.coordinates[0].forEach((point) => bounds.extend(point as [number, number]));
        instance.fitBounds(bounds, { padding: 24, duration: 0 });
      } else {
        instance.jumpTo({ center, zoom: 15 });
      }
    }
    marker.current.setLngLat(center);
  }, [value, radiusM, map]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !value || !radiusM) return;

    const draw = () => {
      const source = instance.getSource("zone") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(circle(value, radiusM));
        return;
      }
      instance.addSource("zone", { type: "geojson", data: circle(value, radiusM) });
      instance.addLayer({ id: "zone-fill", type: "fill", source: "zone", paint: { "fill-color": "#f2a93b", "fill-opacity": 0.2 } });
      instance.addLayer({ id: "zone-line", type: "line", source: "zone", paint: { "line-color": "#e58a14", "line-width": 2 } });
    };

    // isStyleLoaded() is false while tiles load, so wait for the map to settle.
    instance.on("style.load", draw);
    instance.on("idle", draw);
    if (instance.isStyleLoaded()) draw();
    return () => {
      instance.off("style.load", draw);
      instance.off("idle", draw);
    };
  }, [value, radiusM, map]);

  useEffect(
    () => () => {
      marker.current = null;
    },
    [],
  );

  return <div ref={container} className="size-full cursor-crosshair" />;
}
