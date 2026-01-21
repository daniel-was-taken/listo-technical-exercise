import { useMemo, useState } from "react";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { useToolInput, useToolOutput, useWidgetState } from "./openai";

type Stay = {
  id: string;
  name: string;
  city: string;
  rating: number;
  price_per_night: number;
  badges: string[];
  amenities: string[];
  summary: string;
};

type ToolOutput = {
  city: string;
  results: Stay[];
  selected?: Stay | null;
  applied_filters: { min_rating?: number; sort?: "rating" | "price" };
};

type WidgetState = {
  city?: string;
  min_rating?: number;
  sort?: "rating" | "price";
  selected_id?: string | null;
};

export function Widget() {
  const toolInput = useToolInput() ?? {};
  const toolOutput = (useToolOutput() ?? {}) as Partial<ToolOutput>;

  const [state, setState] = useWidgetState<WidgetState>(() => ({
    city: toolInput.city,
    min_rating: toolInput.min_rating,
    sort: toolInput.sort,
    selected_id: null,
  }));

  // Local-only form typing (we commit to widgetState on Apply)
  const [cityDraft, setCityDraft] = useState(state.city ?? toolOutput.city ?? "");
  const [minRatingDraft, setMinRatingDraft] = useState<string>(
    (state.min_rating ?? toolOutput.applied_filters?.min_rating ?? "").toString()
  );
  const [sortDraft, setSortDraft] = useState<"rating" | "price">(state.sort ?? toolOutput.applied_filters?.sort ?? "rating");

  const results: Stay[] = toolOutput.results ?? [];
  const selected: Stay | null =
  (toolOutput.selected as Stay | null | undefined) ??
  (state.selected_id ? results.find((s) => s.id === state.selected_id) ?? null : null);


  const canCallTool = typeof window.openai?.callTool === "function";

  const header = useMemo(() => {
    const city = toolOutput.city ?? state.city ?? "";
    return city ? `Stays in ${city}` : "HotelStay";
  }, [toolOutput.city, state.city]);

  async function applySearch() {
    const nextCity = cityDraft.trim();
    const min_rating = minRatingDraft ? Number(minRatingDraft) : undefined;
    const sort = sortDraft;

    // Persist state (note: widgetState is visible to the model—keep it small) :contentReference[oaicite:9]{index=9}
    setState({ city: nextCity, min_rating, sort, selected_id: null });

    // Ask host to call the tool again from the widget
    // Requires tool to be marked widgetAccessible :contentReference[oaicite:10]{index=10}
    if (canCallTool) {
      await window.openai.callTool!("explore_stays", { city: nextCity, min_rating, sort });
    }
  }

  async function selectStay(id: string) {
    const city = (toolOutput.city ?? state.city ?? cityDraft).trim();
    const min_rating = state.min_rating;
    const sort = state.sort;

    setState({ ...state, selected_id: id });

    if (canCallTool) {
      await window.openai.callTool!("explore_stays", { city, min_rating, sort, selected_id: id });
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-secondary text-sm">ChatGPT App Widget</p>
          <h2 className="heading-lg">{header}</h2>
          <p className="text-secondary text-sm mt-1">
            Mock data • component-initiated tool calls
          </p>
        </div>
        <Badge color="success">{results.length} results</Badge>
      </div>

      {/* Search / Filters */}
      <div className="rounded-2xl border border-default bg-surface p-3 shadow-sm space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1">
            <div className="text-sm font-medium text-secondary">City</div>
            <input
              className="w-full rounded-xl border border-subtle bg-default px-3 py-2 text-sm outline-none"
              placeholder="Paris"
              value={cityDraft}
              onChange={(e) => setCityDraft(e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium text-secondary">Min rating</div>
            <input
              className="w-full rounded-xl border border-subtle bg-default px-3 py-2 text-sm outline-none"
              placeholder="4.3"
              inputMode="decimal"
              value={minRatingDraft}
              onChange={(e) => setMinRatingDraft(e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm font-medium text-secondary">Sort</div>
            <select
              className="w-full rounded-xl border border-subtle bg-default px-3 py-2 text-sm outline-none"
              value={sortDraft}
              onChange={(e) => setSortDraft(e.target.value as any)}
            >
              <option value="rating">Rating</option>
              <option value="price">Price</option>
            </select>
          </label>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-secondary">
            Tip: Click a stay to load details (calls the tool again).
          </div>
          <Button color="primary" onClick={applySearch} disabled={!canCallTool}>
            Apply
          </Button>
        </div>

        {!canCallTool && (
          <div className="text-xs text-secondary">
            This widget is running outside ChatGPT (dev server). `window.openai.callTool` is unavailable.
          </div>
        )}
      </div>

      {/* Results + Details */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-default bg-surface p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="heading-md">Results</h3>
            <div className="text-xs text-secondary">
              Sorted by {toolOutput.applied_filters?.sort ?? state.sort ?? "rating"}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {results.map((stay) => (
              <button
                key={stay.id}
                onClick={() => selectStay(stay.id)}
                className="text-left rounded-2xl border border-subtle bg-default p-3 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{stay.name}</div>
                    <div className="text-sm text-secondary">
                      {stay.city} • {stay.price_per_night}/night
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {stay.badges.slice(0, 3).map((b) => (
                        <Badge key={b} color="success">
                          {b}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge color={stay.rating >= 4.5 ? "secondary" : "success"}>
                    {stay.rating.toFixed(1)} ★
                  </Badge>
                </div>
              </button>
            ))}

            {results.length === 0 && (
              <div className="text-sm text-secondary py-6 text-center">
                No results. Try another city.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-default bg-surface p-3 shadow-sm">
          <h3 className="heading-md">Details</h3>
          <div className="mt-3">
            {selected ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{selected.name}</div>
                    <div className="text-sm text-secondary">
                      {selected.city} • {selected.price_per_night}/night
                    </div>
                  </div>
                  <Badge color="success">{selected.rating.toFixed(1)} ★</Badge>
                </div>

                <p className="text-sm text-secondary">{selected.summary}</p>

                <div>
                  <div className="text-sm font-medium text-secondary mb-2">Amenities</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.amenities.map((a) => (
                      <Badge key={a} color="success">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  variant="soft"
                  color="secondary"
                  onClick={() => window.openai?.sendFollowUpMessage?.({ prompt: `Compare "${selected.name}" to the other options in terms of value.` })}
                  disabled={!window.openai?.sendFollowUpMessage}
                  block
                >
                  Ask ChatGPT to compare
                </Button>
              </div>
            ) : (
              <div className="text-sm text-secondary">
                Select a stay to view details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
