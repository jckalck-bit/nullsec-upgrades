# Nullsec Upgrades 1.2.3
- Promotes the 1.2.3 beta lineage to stable package metadata, for EveJS 261126.2 / Launcher 1.0.97. No balance changes or new gameplay features.
- Removes unused declarations, moves worker exclusion before allocations, reuses normalized hook paths, avoids duplicate cache lookup and skips disabled diagnostic formatting. Consolidates industrial owner-key and decay condition calculations.
- Retains all 19 feature tests, adds fresh-VM journal reload coverage and Verbose OFF authorization checks. Preserves configuration, journal schema, menu, shared API and stable GitHub update metadata.
- All 17 isolated regression checks and static syntax/manifest checks passed. Full native-source regression and live client/server testing remain pending; no claim of live verification. No GitHub publication performed.

# Nullsec Upgrades 1.2.3-beta5
- Client-only Feature Validation layout correction: collapsed feature summaries by default, individually expandable cached details and Run Test buttons, direct vertically stacked native auto-height labels instead of fixed-height feature blocks. Text wraps within the scroll viewport; no diagnostic data removed. Expand/collapse does not send RPCs. Expanded keys survive refresh and tab changes. Scroll position is restored where supported by the native client.
- Wider default 720 x 650 resizable window; a new window ID intentionally resets the previously saved narrow window geometry once. Existing mod settings, persistent journal, server code, staff/verbose gates and GitHub update configuration are unchanged. Client layout and RPC behavior tested using mocks; actual EVE rendering still requires live verification.

# Nullsec Upgrades 1.2.3-beta4
- Native 261126.2 first-spawn policy waits 60 minutes for Prospecting Arrays. Bypass the wait for the selected tier only when Instant site respawn is enabled or that tier has a zero respawn timer. The native power/workforce/fuel/claim checks remain. Nonqualifying Arrays and other upgrade classes retain the native wait. Existing cooldown journals retain recorded deadlines.
- Register industrial settlement before IndexPoints startup snapshot. A forced test covers startup decay crossing a level threshold; cached bonuses retain their existing startup semantics.
- Feature Validation: individual tests and Test All queue one feature at a time in the world owner, reject concurrent jobs, and reuse bounded source and syntax-validation caches. Refresh retrieves the completed results; Inspect Live reads the current system, including cached hub accounting, native and modified rock descriptors and already materialized rocks, index/industrial journals, cooldowns, reserves and sizes. Results include sample limitations and timestamps, and do not replace observed live evidence. No automatic diagnostic polling. Live inspection samples at most 16 sites and 5,000 declared/generated rocks; incomplete data may remain Pending. Whole-row grading tolerance is not a guarantee of exact volume shares.
- Uneven-rock fixtures, first-spawn gate, native descriptor comparison and index threshold-crossing tests. Test All emits a single summary line; all diagnostic actions require Verbose Logging and staff access. No gameplay mutations in forced checks. Live inspection uses read-only native snapshots and does not settle fuel, spawn sites or force mining events.
- Separate launcher-owned shared-menu source correction and read-only frozen payload checker. The live payload and actual Windows client were not verified in this environment.
- Preserved native/Docker manifest, settings and durable journal, stable GitHub updater integration; no publication. Offline fixture and regression tests only.

# Nullsec Upgrades 1.2.3-beta3
- Per-feature Run Test and Test All in the Feature Validation tab, using the actual mod logic in an isolated fixture and separately reporting live hook readiness and runtime evidence.
- Staff and Verbose Logging authorization required; no automatic test execution, real universe writes, diagnostic persistence or additional background polling. Requests are rate-limited; results cached in memory.
- All 18 feature fixture tests, edge-setting cases, native source transformation, lifecycle, industrial, authorization and mocked client regressions passed offline against EveJS 261126.2. Live beta3 client rendering and gameplay integration remain unverified. Beta2 menu reported working by user.
- Native/Docker declarations, configuration, persistent state and stable GitHub update channel preserved. No GitHub publication.

# Nullsec Upgrades 1.2.3-beta2
- Shared menu entry and window renamed Nullsec Upgrades; Industrial Index and Feature Validation tabs. Enabled features only; validation defaults to cached status, refresh on request, no new background polling. Index refresh remains only on its active tab.
- World-owner-only lazy diagnostics; worker threads and known worker process entrypoints skip loader setup. No repeated initial feature dumps, no mod logs or diagnostic work when Verbose Logging is OFF. Status changes log once per transition; Pending does not overwrite observed results.
- Patch anchor failures report Failed where detected; feature results remain Pending until relevant runtime evidence. The prior independent replacement fallback no longer force-purges delayed terminal sites if a lifecycle hook is unavailable.
- Separate Launcher 1.0.97 shared-menu resource patch removes invalid styled label overrides identified by client build 3724492. Not installed by this mod and not required for server gameplay.
- Retains beta1 settings, persistent state and GitHub stable channel. Offline validation only; live menu, gameplay and multi-process bootstrap validation remain pending. No publication.

# Nullsec Upgrades 1.2.3-beta1
- Display name capitalization; stable ID, settings, state journal and GitHub source retained.
- Exact EveJS 261126.2 runtime gate. Launcher baseline 1.0.97, Windows client 3724492.
- Native terminal occupancy grace retained; depleted owned sites hide their root and receive separately allocated replacement IDs via native reconciliation. Standard cooldowns start at depletion. Mercoxit reserves keep their existing rules.
- Native mining duplicate results skipped; shutdown hook settles batches before GameStore flush.
- Virtual planetary resources account for native den workforce siphons without a separate polling loop.
- Verbose Logging OFF disables automatic diagnostics and all mod log output; debug menu staff/verbose only.
- Offline tests cover source transforms, diagnostic gates, slot allocation, native API anchors and package metadata. Live server/client tests pending. No publication.

## Changes since 1.2.1
- Fixed industrial progression using actual mined volume, including Solo Progression yield bonuses.
- Retained 60-second batching and duplicate protection.
- Added a verbose-only Industrial Index Debug menu.
- Reworked mining respawn integration and fixed the obsolete respawn variable startup crash.
- Added maximum-index, empty-batch and player-corporation sovereignty checks.

Pending live tests: industrial decay, Mercoxit queue, mining drones, respawn timing, ownership filtering and persistence.
