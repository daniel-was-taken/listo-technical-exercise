from __future__ import annotations

import json
from pathlib import Path
from typing import Literal, Optional

from fastmcp import FastMCP
from fastmcp.resources import ResourceResult, ResourceContent
from fastmcp.tools.tool import ToolResult
from mcp.types import TextContent

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "stays.json"
WEB_DIST = ROOT / "web" / "dist"

WIDGET_URI = "ui://widget/stays.html"

def load_stays():
  return json.loads(DATA_PATH.read_text(encoding="utf-8"))

def find_built_asset(suffix: str) -> str:
  """
  Find the first asset in web/dist/assets that ends with suffix, return its text.
  """
  assets_dir = WEB_DIST / "assets"
  candidates = sorted(assets_dir.glob(f"*{suffix}"))
  if not candidates:
    raise FileNotFoundError(f"No built asset ending with {suffix} found in {assets_dir}. Did you run `npm run build`?")
  return candidates[-1].read_text(encoding="utf-8")

def build_widget_html() -> str:
  """
  Apps SDK expects HTML templates served as `text/html+skybridge` that can inline JS/CSS. :contentReference[oaicite:13]{index=13}
  """
  js = find_built_asset(".js")
  css = find_built_asset(".css")

  return f"""
<div id="root"></div>
<style>{css}</style>
<script type="module">
{js}
</script>
""".strip()


mcp = FastMCP(
  name="HotelStay",
  instructions="""
This server powers a demo ChatGPT app widget.
Use explore_stays to browse mock stays by city, filter, and select an item for details.
All data is local mock JSON; no external calls.
""".strip(),
)

# --- UI template resource (ChatGPT loads this when outputTemplate points to it) ---
# Needs mime_type="text/html+skybridge" :contentReference[oaicite:14]{index=14}
@mcp.resource(
  uri=WIDGET_URI,
  name="HotelStay Widget",
  description="UI bundle for the HotelStay widget.",
  mime_type="text/html+skybridge",
  meta={"openai/widgetPrefersBorder": True},
)
def stays_widget() -> ResourceResult:
  html = build_widget_html()
  return ResourceResult(
    contents=[
      ResourceContent(content=html, mime_type="text/html+skybridge"),
    ],
    meta={"openai/widgetPrefersBorder": True},
  )


# --- Tool ---
@mcp.tool(
  name="explore_stays",
  description=(
    "Browse stays from mock data by city, optional rating filter, sort, and optional selected_id.\n"
    "Use this when the user wants to explore accommodations in a city and see an interactive list."
  ),
  annotations={
    "title": "Explore stays (mock)",
    "readOnlyHint": True,
    "idempotentHint": True,
    "openWorldHint": False,
    "destructiveHint": False,
  },
  # Apps SDK requires tool metadata like outputTemplate and widgetAccessible. :contentReference[oaicite:15]{index=15}
  meta={
    "securitySchemes": [{"type": "noauth"}],
    "openai/outputTemplate": WIDGET_URI,
    "openai/widgetAccessible": True,
    "openai/toolInvocation/invoking": "Searching stays…",
    "openai/toolInvocation/invoked": "Results ready",
  },
)
def explore_stays(
  city: str,
  min_rating: Optional[float] = None,
  sort: Literal["rating", "price"] = "rating",
  selected_id: Optional[str] = None,
) -> ToolResult:
  stays = load_stays()

  city_norm = city.strip().lower()
  filtered = [s for s in stays if s["city"].lower() == city_norm]

  if min_rating is not None:
    filtered = [s for s in filtered if float(s.get("rating", 0)) >= float(min_rating)]

  reverse = True if sort == "rating" else False
  key = "rating" if sort == "rating" else "price_per_night"
  filtered.sort(key=lambda s: s.get(key, 0), reverse=reverse)

  selected = None
  if selected_id:
    for s in filtered:
      if s["id"] == selected_id:
        selected = s
        break

  structured = {
    "city": city.strip(),
    "results": filtered,
    "selected": selected,
    "applied_filters": {"min_rating": min_rating, "sort": sort},
  }

  # Include the Apps SDK meta again at response time (some clients check response meta). :contentReference[oaicite:16]{index=16}
  return ToolResult(
    content=[TextContent(type="text", text=f"Found {len(filtered)} stays in {city.strip()}.")],
    structured_content=structured,
    meta={
      "openai/outputTemplate": WIDGET_URI,
      "openai/widgetAccessible": True,
    },
  )


if __name__ == "__main__":
  # HTTP transport exposes the MCP endpoint at /mcp by default. :contentReference[oaicite:17]{index=17}
  mcp.run(transport="http", host="127.0.0.1", port=8000)
