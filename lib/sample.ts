import type { RawRow } from "./types";

/** Messy example shown in the paste-mode placeholder. */
export const SAMPLE_PASTE = `Q1 sales notes — dumped from email + the POS export, needs cleaning

West region, March: Trailhead Pack — 128 units, $18,432
west / march / Summit Bottle ... 512 units  4,608.00
North, Mar 2024, Trailhead Pack, 96, 13824
East region March Summit Bottle 240 units $2,160
West, March, Trailhead Pack, 128, $18,432   (dup? entered twice)
South — March — Base Layer Tee — 300 — 7,500
North March Base Layer Tee 45 units (revenue missing)
West April Trailhead Pack 140 $20,160
Summit Bottle, East, April, 260, 2340
south/april/Base Layer Tee/280/7000
North, April, Trailhead Pack, 512000, $92160   <-- looks off
East April Summit Bottle 250 -1800  (return/refund)`;

/**
 * Prebuilt structured rows for the "Load sample data" action. Bypasses the AI
 * so the app is fully explorable offline. Intentionally includes a duplicate,
 * a missing value, an outlier, a return, and one AI-estimated cell.
 */
export function sampleRawRows(): RawRow[] {
  return [
    { fields: { region: "West", month: "March", product: "Trailhead Pack", units: 128, revenue: 18432 } },
    { fields: { region: "West", month: "March", product: "Summit Bottle", units: 512, revenue: 4608 } },
    { fields: { region: "North", month: "March", product: "Trailhead Pack", units: 96, revenue: 13824 } },
    { fields: { region: "East", month: "March", product: "Summit Bottle", units: 240, revenue: 2160 } },
    // duplicate of row 1
    { fields: { region: "West", month: "March", product: "Trailhead Pack", units: 128, revenue: 18432 } },
    { fields: { region: "South", month: "March", product: "Base Layer Tee", units: 300, revenue: 7500 } },
    // missing revenue
    { fields: { region: "North", month: "March", product: "Base Layer Tee", units: 45, revenue: null } },
    // AI-estimated revenue
    {
      fields: { region: "West", month: "April", product: "Trailhead Pack", units: 140, revenue: 20160 },
      inferred: ["revenue"],
      source_snippet: "West April Trailhead Pack 140 (revenue estimated from unit price)",
    },
    { fields: { region: "East", month: "April", product: "Summit Bottle", units: 260, revenue: 2340 } },
    { fields: { region: "South", month: "April", product: "Base Layer Tee", units: 280, revenue: 7000 } },
    // outlier revenue
    { fields: { region: "North", month: "April", product: "Trailhead Pack", units: 512, revenue: 92160 } },
    // return (negative revenue)
    { fields: { region: "East", month: "April", product: "Summit Bottle", units: 250, revenue: -1800 } },
    { fields: { region: "West", month: "May", product: "Summit Bottle", units: 320, revenue: 2880 } },
    { fields: { region: "South", month: "May", product: "Trailhead Pack", units: 110, revenue: 15840 } },
  ];
}
