# Nullsec Upgrades 1.2.3

Target: EveJS 261126.2, Launcher 1.0.97, client 3724492. Import the ZIP through the launcher, configure, then restart the game server. Native and Docker are declared supported. Stop server and market before updating, and back up `config/nullsec-upgrades.json` and `config/nullsec-upgrades-state.json`. Docker uses the existing config mount. Do not run two versions simultaneously or rename the disabled loader manually. The loader enforces the exact date-version at runtime. The stable GitHub update channel is preserved; experimental update switching is not included.

The independent replacement lifecycle protects occupied depleted grids: hide the managed beacon, choose a distinct free slot and position, and let native cleanup wait for evacuation. If no slot is clear, do not force physical removal. First-spawn wait is bypassed for a Prospecting Array only with Instant site respawn or its zero respawn timer; native claim, power, workforce and fuel checks remain. Existing journal deadlines are preserved. Graceful shutdown settles pending mining credits; an abrupt crash can lose a partial batch, and native database plus journal are not one transaction.

The shared Mods menu is available with Verbose Logging ON and staff access. The launcher-owned shared-menu fix, if needed for client 3724492, remains separate from this mod. The validation tab uses collapsed cached results, independent live evidence and on-demand inspection. No validation polling or startup self-tests. Actual client rendering and native/Docker live integration have not been verified in this release audit. The full native-source regression suite could not be rerun because the server and launcher archives were not visible to the execution environment; isolated tests and syntax checks do not replace that suite. 17 isolated regression checks passed in this audit, including eight existing feature fixtures replayed against beta5 and the new runtime, plus startup index ordering, verbose gates, worker exclusion, deterministic grade plans, quantity arithmetic, reserve arithmetic, journal migration/reload and manifest parity. See CHANGELOG.md for historical changes.

## Configuration

- **Automatic planetary resources**: Use natural system power and workforce without requiring physical skyhooks. Default: False.

- **Mining escalations**: Roll for an escalation after a mining site is depleted. Default: False.
- **Array 1 escalation chance (%)**: Percentage chance after depletion for this Array. Default: 5.
- **Array 2 escalation chance (%)**: Percentage chance after depletion for this Array. Default: 15.
- **Array 3 escalation chance (%)**: Percentage chance after depletion for this Array. Default: 25.
- **Ore scaling**: Increase ore quantities in sovereignty mining sites and escalations. Default: False.
- **Array 1 ore bonus (%)**: Additional ore percentage for this Array; escalations use Array 3. Default: 10.
- **Array 2 ore bonus (%)**: Additional ore percentage for this Array; escalations use Array 3. Default: 20.
- **Array 3 ore bonus (%)**: Additional ore percentage for this Array; escalations use Array 3. Default: 30.
- **Strict mining site size**: Array 1 spawns Small deposits only; Array 2 spawns Medium deposits (named simply “Ore Deposit” in the bundled client data); Array 3 spawns Large deposits only. Default: False. Applies only to sovereignty prospecting sites, not escalations. Existing active sites for the same upgrade and rotation are retained until replacement. No wrong-size fallback if a matching template is unavailable.
- **Mining site tier distribution**: Customize ore grade volume shares in sovereignty mining sites. Default: False.
- **Scale tier distribution by Array level**: Use Array-specific grade shares when custom distribution is enabled. Default: False.
- **Tier distribution randomness**: Randomize grade shares for each new site when custom distribution is enabled. Default: True.
- **Tier 4 (%)**: Target ore grade volume percentage; all four must total 100%. Default: 50.
- **Tier 3 (%)**: Target ore grade volume percentage; all four must total 100%. Default: 30.
- **Tier 2 (%)**: Target ore grade volume percentage; all four must total 100%. Default: 15.
- **Tier 1 (%)**: Target ore grade volume percentage; all four must total 100%. Default: 5.
- **Commands**: Enable both staff mining commands independently of gameplay toggles. Default: False.
- **Reset mining sites**: Reset sovereignty mining sites at next startup; turns off after successful reset. Default: False.
- **Verbose Logging**: Enable mod logging; OFF suppresses mod logs. Default: False.

## Mechanics
Escalations are triggered by depletion, with default chances of 5%, 15%, and 25% for Arrays 1–3. Chaining uses Array 3 chance. Escalations use highest ore grades and have a 24-hour lifetime. Ore scaling for escalations uses Array 3. Grade distribution targets ore volume shares rather than selecting an entire site's grade. Randomization occurs per site. Invalid numeric settings fall back to defaults.

## Commands
`/miningescalation` forces an escalation; `/nukeminingsites` resets mining sites. Both require staff access and the Commands toggle. The latter now targets only Prospecting Array sites and this mod’s mining escalations, never ordinary ore/ice/gas anomalies. Administrative reset clears relevant Array cooldowns. The startup reset targets sovereignty prospecting sites only and clears its configuration switch after successful execution.

## Mining site respawn

Instant site respawn (off by default) overrides the three independent timers with zero delay. Otherwise Array 1 uses 60 minutes, Array 2 uses 260 minutes and Array 3 uses 600 minutes by default. These are the selected retail duration defaults; all three start on full depletion, not first warp. Values accept up to two decimal places, from zero to 525600 minutes. The stock launcher displays all four settings; timer fields are ignored while instant respawn is enabled.

The native persistent instance stores an absolute deadline. A separate, versioned journal at `config/nullsec-upgrades-state.json` preserves upgrade cooldowns by source system and upgrade type, not individual installed upgrade IDs. Reconciliation filters only owned prospecting definitions and preserves pending terminal sites. One-shot wakeups request a scoped native reconcile when cooldowns expire; there is no polling loop. Preserve this state file across Docker/container recreation. Reset clears cooldowns; existing deadlines are not retroactively changed by configuration edits.

Depletion is detected using the native lifecycle event after the server verifies the last asteroid. A scoped native teardown helper attempts to release a depleted site’s occupied grid, then requests the native scheduler to reconsider its deadline. If the helper is unavailable, normal occupancy grace remains. Native rotation schedules the replacement. The helper is an internal EveJS testing export, not a stable public API.

## Escalations
Automatic escalation rolls are triggered by the confirmed native depletion event, not by recurring ore scans. A successful roll is added to the durable per-system counter. At most two active escalations per system are admitted automatically; the queue stores only a count per system; site information is generated at admission. Slot release or startup recovery drains queued work. Staff `/miningescalation` bypasses the automatic limit. Expiry is 24 hours from creation, and Array 3 settings apply to chained escalation chance and ore scaling. Journal and native dungeon state are separate stores: abrupt process failure between their commits is not fully transactional. A persisted roll marker prevents rerolling the same parent; queue reservation and native creation are not atomic.

## Automatic planetary resources
When enabled, cached natural star and planetary power and workforce replace local harvested resources, never add to them. No skyhook entities are created. Existing physical skyhooks remain intact; native workforce import/export and reagent/inventory mechanics are unchanged. Workforce siphons from mercenary dens are not reflected in virtual local resources. Disable and restart to restore normal harvesting. This is resource accounting virtualization, not removal of native skyhook processing.

## Compatibility and validation
The native depletion listener and lifecycle/reconciliation wrappers are independent of mining-rock source text. Strict size selection, ore quantity/grade selection, planetary resource lookup and the shared native scheduler still require guarded source transforms. Transforms validate syntax and fall back to original source when anchors are missing. In particular, the respawn scheduler falls back to native timers if its source cannot be safely transformed. Verbose Logging (last config option) reports successful hooks, failures, deadlines, site creations and virtual resource totals; it is off by default.

Offline validation: JavaScript syntax; manifest JSON; original server scheduler/strict/resource transformation syntax; unsupported scheduler source fallback; mocked native depletion, ownership lookup, cooldown persistence, replacement filtering, FIFO two-slot admission, queue reload, natural resource sums, and tier share totals. These are not live server tests. Full native/Docker testing, occupied-grid teardown behavior, integration with Better Moon Anomalies, unusual sovereignty upgrade removal/replacement paths, and full crash consistency remain unverified. Native source rewriting remains; stable GitHub update integration is included. The launcher does not conditionally hide every dependent field. No GitHub publication.

## Mercoxit and configuration layout

The optional Mercoxit sites setting adds the native Enormous Mercoxit Deposit (client dungeon 12986) for each online level 3 Prospecting Array. The initial site is immediate. Reserve sites accumulate at the configured whole-hour interval (default 12), up to Max queued (default 3, excluding the active site). The timer pauses at capacity and resumes when a reserve is consumed. Zero hours enables immediate replacement; zero reserves means no stockpile. Queue records and absolute deadlines use the existing mod state file. Mercoxit uses a separate lifecycle from ordinary Array timers, scaling, grade distribution and escalation rolls.

The optional settings-layout file groups related fields into rows for Launcher 1.0.94; narrow windows and older launchers may stack fields. The launcher documentation does not expose conditional visibility or read-only dynamic tables in this layout schema. Experimental update switching is not included.

Validation: loader syntax, transformed native source syntax, queue arithmetic and layout references checked. Live native/Docker lifecycle and inter-mod compatibility are not verified.

## Industrial index
Independent progression and decay toggles default off; both rates default 1. Progression credits successful nonduplicate persistent player mining cargo settlements, excluding waste, using the historical volume thresholds 1.5/3/6/12/24 million m³ mapped to native index levels. Decay is compounded by elapsed time, checked hourly and at mining settlements; matching saved ownership, points and rate are required for offline catch-up. Launcher 1.0.94 does not document computed read-only fields; decay rate is labeled directly as percent per day. Both rates accept 0–100 in 0.01 steps. Mission and nonpersistent mining paths are not covered.

## Shared index and lifecycle
Includes optional shared Index Points (`globalThis.__nullsecUpgrades.getIndexPoints(systemID)`), startup escalation and local resource bonuses, count-only escalation queues (legacy queue migrated), shared deadline scheduler, teardown deduplication and 60-second mining credit batching. Native sovereignty writes are batched, so visible progression can lag by up to 60 seconds. A crash between queue reservation and site creation can lose one queued site. Existing guarded native source transformations remain; live integration testing is required. No experimental update channel is configured.


## Diagnostics and operational guide

Install the ZIP using the EveJS Launcher mod import workflow, enable Nullsec upgrades, configure it and restart the game server. The package declares native and Docker support and uses loader-rename activation. Do not rename the disabled loader manually when using the launcher. Preserve the configuration and state files across container recreation; back them up before upgrading. All settings require a server restart. Do not run two versions simultaneously.

### Index Points and benefits

Index Points is off by default. When enabled, the live shared API returns the sum of the native industrial, military and strategic index levels (each 0–5), clamped to 0–15. Unclaimed systems return zero. Other mods can call `globalThis.__nullsecUpgrades.getIndexPoints(systemID)` after initialization. The escalation and resource toggles are independent, default off, and require Index Points. Both use a startup snapshot, with newly observed claims eligible for an initial snapshot. Changes to index levels do not change cached bonuses until restart. Escalation chance is additive: 25% + 15 points = 40%, capped at 100%; chained rolls use Array 3. The resource bonus multiplies local power and workforce by `1 + points/100`, rounded to whole units; 10,000 becomes 11,500 at 15 points. Imports are not multiplied. The resource hook works on native local harvest or virtual resources, depending on configuration. No ore quantity bonus is attached to Index Points.

### Feature operation and checks

| Feature | Example / verification |
|---|---|
| Mining escalations | Finish an eligible site; inspect the persisted roll and effective probability. A failed roll is normal. Two automatic active sites per system; reserves are counts, with no configured queue cap. |
| Ore scaling | Array 3 +30% turns 1000 units into 1300, subject to integer rounding. Check generated rock quantities against the original template. |
| Strict size | Verify newly generated Array 1/2/3 deposits are Small/Medium/Large. Existing sites are not resized. |
| Tier distribution | Manual 50/30/15/5 targets volume by grade IV/III/II/I. Array mode targets 30/50/15/5, 40/40/15/5, 50/30/15/5 respectively. Random mode varies manual weights by up to 10 percentage points; Array mode uses bounded ranges (A1 IV 20–40, III 40–60; A2 both 30–50; A3 IV 40–75, III 20–40; II 5–20 and I 0–5). Targets sum to 100%; whole-rock assignment can deviate. |
| Respawn | Complete a standard site; compare its recorded absolute cooldown with the replacement time. Instant mode uses zero delay but still requires native teardown/reconciliation. |
| Mercoxit | With 12 hours and three reserves, one active site can accumulate three replacements. Inspect queue and deadlines. |
| Automatic resources | Compare local resource totals with the static star and planet definitions; no physical skyhook is created. |
| Industrial progression | At multiplier 2, 1000 m³ recovered credits 2000 m³ equivalent. Native writes are batched every 60 seconds; an abrupt crash may lose pending credits. |
| Industrial decay | At 1% daily, points are multiplied by 0.99 after a day, with fractional carry. Hourly checks and saved timestamps support downtime accounting under matching ownership and settings. |
| Index Points | Compare the shared sum with the three native index levels. |
| Index escalation | Compare base chance plus cached points with the effective probability. |
| Resource boost | Compare local production before and after restart with the cached multiplier; final native accounting requires independent verification. |
| Reset | Enable for one startup; verify standard sites and cooldowns are reset and the switch clears. |
| Commands | Enable and restart; use a staff character. Diagnostic commands do not spawn or remove sites. |
| Verbose Logging | Enable and restart to see diagnostic transitions; disable to suppress mod logs. Manual command replies remain available. |

### Diagnostic commands

- `/nullsecstatus`: reports Disabled, Pending, Validated or Failed for each tracked feature. Validation is scoped to the evidence described beside the status, not a guarantee of complete gameplay correctness.
- `/nullsecdebug`: reports live Index Points, cached escalation bonus, effective chances, industrial journal, owned sites and queue data for the current system.
- `/nullsecvalidate`: adds the feature status report to a read-only current-system snapshot and checks counter/deadline integrity. It does not force a gameplay event.
- `/nullsecqueue`: lists active escalation count, reserve counters, Mercoxit records and cooldown deadlines in epoch milliseconds. Staff-forced sites can exceed the automatic cap.

All require Commands and staff access. `/nukeminingsites local` and `/nukeminingsites all` are destructive administrative commands; use with care. Automatic diagnostic messages are emitted only with Verbose Logging enabled; identical consecutive status/details are suppressed. No new periodic diagnostic timer is introduced.

### Troubleshooting and limitations

Pending is expected until the relevant event occurs. Strict size, tier distribution, respawn timing and final resource accounting do not yet have independent end-to-end validation. Some checks verify arithmetic or a native readback only. Existing hook failure isolation is retained; diagnostic failures do not automatically disable gameplay. If a source transform is rejected, inspect verbose output and test with other anomaly mods disabled before reporting a conflict. If the journal cannot be loaded, preserve a copy rather than deleting it blindly. No live native/Docker test was performed for 1.2.1. Experimental updates remain unimplemented. No GitHub publication.

## Forced feature checks

In the Feature Validation tab, use Run Test beside an enabled feature or Test All. Staff access and Verbose Logging must both be enabled. Refresh only reads cached results. The test command uses the settings loaded at server startup (not any un-applied configuration edits), executes actual mod code in an isolated in-memory fixture with a simulated clock, checks relevant native source transformations, and inspects live hook registration separately. The fixture does not receive live native write APIs, real persistence, or real timers; its fake database, sites, and notifications are discarded. It never depletes, spawns, purges or changes real sites, indices, queues or resources. The runner is loaded only on a permitted explicit test request, not at startup or with Verbose Logging off. Tests use one RPC per request; repeated requests within 500 ms of completion return cached results. The UI displays forced-test result, live hook readiness, and naturally observed runtime evidence separately. A passing isolated test is not proof of full live client/gameplay behavior. No additional background timers, diagnostic storage writes or polling are introduced. Actual live client rendering and integration tests remain pending.
