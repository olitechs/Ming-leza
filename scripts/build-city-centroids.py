#!/usr/bin/env python3
"""Build the compact, offline city-centroid lookup used by Mingleza's map.

Source: GeoNames cities15000 and admin1CodesASCII downloads.
License: Creative Commons Attribution 4.0. The app shows required attribution.
"""

from __future__ import annotations

import csv
import io
import json
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "data" / "city-centroids.json"
CITIES_URL = "https://download.geonames.org/export/dump/cities15000.zip"
ADMIN1_URL = "https://download.geonames.org/export/dump/admin1CodesASCII.txt"
USER_AGENT = "MinglezaCityCentroids/1.0 (https://github.com/olitechs/Ming-leza)"


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def main() -> None:
    admin1_names: dict[str, str] = {}
    for row in csv.reader(io.StringIO(download(ADMIN1_URL).decode("utf-8")), delimiter="\t"):
        if len(row) >= 3:
            admin1_names[row[0]] = row[1] or row[2]

    cities_payload = download(CITIES_URL)
    with zipfile.ZipFile(io.BytesIO(cities_payload)) as archive:
        text_member = next(name for name in archive.namelist() if name.endswith(".txt"))
        text = io.TextIOWrapper(archive.open(text_member), encoding="utf-8")
        records_by_key: dict[tuple[str, str, str], tuple[list[object], int]] = {}
        for row in csv.reader(text, delimiter="\t"):
            if len(row) < 15 or row[6] != "P" or not row[8]:
                continue
            try:
                latitude = float(row[4])
                longitude = float(row[5])
                population = int(row[14] or 0)
            except ValueError:
                continue
            if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
                continue
            region_code = row[8] + "." + row[10] if row[10] else ""
            record: list[object] = [
                row[1],
                row[2],
                row[8],
                admin1_names.get(region_code, ""),
                latitude,
                longitude,
                population,
            ]
            key = (row[8], row[1].casefold(), row[10])
            if key not in records_by_key or population > records_by_key[key][1]:
                records_by_key[key] = (record, population)

    records = [entry[0] for entry in records_by_key.values()]
    records.sort(key=lambda item: (str(item[2]), str(item[0]).casefold(), str(item[3]).casefold()))
    output = {
        "source": "GeoNames cities15000 and admin1CodesASCII",
        "license": "CC BY 4.0",
        "fields": ["name", "asciiName", "countryCode", "region", "latitude", "longitude", "population"],
        "cities": records,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} city centroids to {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
