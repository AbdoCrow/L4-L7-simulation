# L4 / L7 Load Balancer Simulation - Full Analysis Report

## 1. Executive Summary

This project is a real-time educational simulation that demonstrates the behavior difference between Layer 4 and Layer 7 load balancing using a live dashboard and mobile traffic generators.

The implementation is event-driven and uses Socket.IO to keep all views synchronized in near real time. The simulation is strong for demos and workshops because attendees can generate traffic from phones while the presenter view visualizes routing decisions and server distribution.

Main balancing behavior:

- L4 mode uses round-robin distribution across the current server list.
- L7 mode uses exact path matching first, then random fallback across all servers when no path match exists.

## 2. Scope and Objective

The simulation aims to show:

- How traffic distribution changes by balancing layer.
- How request paths influence routing in application-aware balancing.
- How server pool configuration affects flow and distribution.

It is designed for interactive explanation, not production load balancing.

## 3. System Overview

### 3.1 Runtime Stack

- Backend: Node.js, Express, Socket.IO.
- Frontend: Two static HTML clients plus shared CSS.
- Transport: WebSocket-style event messaging through Socket.IO.
- Session state: In-memory objects on the server process.

### 3.2 Main Components

- `server.js`: State manager, routing logic, event hub, QR generation.
- `public/presenter.html`: Dashboard UI for mode switching, server management, and live visualization.
- `public/index.html`: Mobile traffic generator for attendees.
- `public/style.css`: Shared visual design and layout.

### 3.3 Data Model

Server state is represented as:

- `id`: unique identifier.
- `name`: display label.
- `path`: route affinity key used by L7 matching.
- `count`: cumulative routed-request counter.

Global server-side state includes:

- `currentMode`: `L4` or `L7`.
- `l4Index`: round-robin pointer.
- `servers[]`: mutable backend pool.
- `messageCooldowns`: per-client anti-spam map for custom messages.

## 4. Architecture

### 4.1 High-Level Flow

1. Server starts and serves static assets.
2. Server detects local IP, builds connection URL, and generates a QR code.
3. Clients connect through Socket.IO and receive `initial_state`.
4. Presenter can switch mode, add/remove servers, reset counters, and set public URL.
5. Mobile clients send simulated requests (`path` plus optional short message).
6. Server selects target based on current balancing mode.
7. Server emits `route_update` to all clients.
8. Presenter animates packet flow and updates counters.

### 4.2 Event Contract

Inbound events to server:

- `switch_mode`
- `update_servers`
- `reset_counters`
- `set_public_url`
- `send_request`

Outbound events from server:

- `initial_state`
- `mode_changed`
- `servers_updated`
- `url_updated`
- `route_update`
- `client_disconnected`

### 4.3 Architecture Strengths

- Event-first design keeps both views synchronized.
- Minimal API complexity for a live demo.
- Good separation between presenter control surface and participant client.

## 5. Type of Balancing

### 5.1 Layer 4 Behavior (Connection-Level)

Selection method:

- Uses `l4Index % servers.length`.
- Increments index after each request.

Effect:

- Even distribution over time across available backend nodes.
- Ignores request path and message content.

Implication for teaching:

- Demonstrates transport-level fairness and simplicity.

### 5.2 Layer 7 Behavior (Application-Level)

Selection method:

- Filters servers where `server.path === request.path`.
- If matches exist, picks one randomly from matched group.
- If no match, falls back to random selection over full server pool.

Effect:

- Route-aware behavior with application context.
- Non-deterministic distribution among same-path servers.

Implication for teaching:

- Demonstrates content-aware routing and policy-driven dispatch.

### 5.3 Comparison

L4 in this implementation:

- Policy: Round robin.
- Path awareness: None.
- Predictability: High.

L7 in this implementation:

- Policy: Path affinity plus random backend choice.
- Path awareness: Yes (exact match only).
- Predictability: Medium.

## 6. Visualization and Metrics

### 6.1 Presenter Visualization

The presenter canvas shows:

- A central load balancer node.
- Dynamic server nodes with labels and path tags.
- Animated packets from ingress to load balancer to target node.
- Color-coded packet paths by route type.
- Optional floating client message near packet.

### 6.2 Participant Visualization

Mobile client shows:

- Current mode and client ID.
- Path-based request buttons.
- Optional short message input.
- Request log with routing result per event.
- Auto-traffic mode at fixed interval.

### 6.3 Implemented Metrics

Current metric set is demo-friendly and mostly operational:

- Per-server request count (`count`) displayed in presenter node badges.
- Routing decision stream via `route_update` events.
- Drop indicator when no server exists.
- Current load balancing mode status.

### 6.4 Missing Metrics (Important Gaps)

Not currently measured:

- End-to-end latency.
- Queue depth and backpressure.
- Throughput per second.
- Path-level success/error ratios.
- Distribution fairness metrics (for example, standard deviation).
- Client/session-level traffic analytics.

## 7. Key Findings

### 7.1 What Works Well

- Core L4 vs L7 educational contrast is clear and interactive.
- Live sync and animation make routing behavior easy to explain.
- Dynamic backend management allows real-time scenario changes.

### 7.2 Technical Risks and Limitations

1. Server configuration trust model is open.
   Any connected client can emit admin-style events (`switch_mode`, `update_servers`, `reset_counters`) because there is no role or auth separation.

2. Public URL update is not persisted in server state.
   `set_public_url` emits updates to current clients but does not replace the base `mobileUrl` and QR payload used for future `initial_state` events.

3. Cooldown map cleanup is incomplete.
   `messageCooldowns` entries are not removed on disconnect, so long sessions with many clients can accumulate stale keys.

4. CSS selector mismatch.
   The UI uses class `Subheading` while stylesheet targets `Subheading` as an element selector, so intended subheading styling may not apply.

5. L7 path matching is exact only.
   No prefix, wildcard, regex, weighted route, or fallback policy controls exist.

6. In-memory-only state.
   Server restart resets mode, counters, server pool, and URL/QR context.

## 8. Recommendations

### 8.1 Short-Term (High Value, Low Cost)

1. Add lightweight role gating for admin events.
2. Persist updated public URL in server state used by `initial_state`.
3. Remove cooldown entries on disconnect.
4. Fix `Subheading` selector to `.Subheading`.

### 8.2 Mid-Term (Observability)

1. Add per-second throughput counters.
2. Add percentile latency simulation and charting.
3. Add path-level and mode-level distribution summaries.
4. Export run summaries as JSON for post-session analysis.

### 8.3 Advanced (Realism)

1. Add weighted round robin and least-connections options.
2. Add L7 rule priorities and prefix routing.
3. Add synthetic server health and failover behavior.
4. Add sticky sessions and failure injection toggles.

## 9. Conclusion

The simulation already achieves its core mission: clearly communicating the conceptual and behavioral difference between L4 and L7 balancing through live interaction.

With a small set of reliability and observability improvements, it can evolve from a strong demo tool into a robust teaching and experimentation platform for traffic engineering concepts.
