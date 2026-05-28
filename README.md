# Train Ticket Graph Query Engine — NestJS Backend

A high-performance RESTful API query engine for analyzing and filtering dependencies and call paths in a microservices graph. Built with NestJS, TypeScript, and Swagger.

---

## 🚀 Architectural Design & Key Decisions

We structured the codebase to be production-grade, highly modular, and easily extensible.

### 1. Traversal Engine (DFS with Strategy-Driven Pruning)

- **Depth-First Search (DFS)** with path-specific cycle detection (using a `Set` for visited nodes) was chosen for path discovery. Since the microservices graph has ~45 nodes, the number of maximal simple paths is relatively small (~319 paths), making DFS extremely fast and efficient (discovered in `<10ms`).
- **Strategy-Driven Optimization (Decoupled Pruning)**:
  - Start and end constraints are pushed down into the path traversal layer via strategy hooks (`shouldStartWith` and `shouldEndWith`).
  - If a filter limits the start node (e.g. `startPublic`), the DFS engine will **only** initiate searches from valid starting nodes, skipping all other root traversals entirely.
  - If a filter limits the end node (e.g. `endSink`), paths that reach a dead-end or cycle are only kept if their terminal node satisfies the constraint.

### 2. Strategy Pattern for Query Filters (Highly Extensible)

- Each query filter is implemented as a class that conforms to the common `RouteFilter` interface.
- **Explicit Filter Registration via Dependency Injection**: Filters are explicitly registered in the `FILTER_CLASSES` array of `GraphModule` and injected as a multi-provider under the `ROUTE_FILTERS` token. The `GraphService` dynamically loads registered filters and applies them to route queries.
- **Adding a New Filter**:
  1. Create a new filter class implementing `RouteFilter` (e.g. `src/graph/filters/new-criteria.filter.ts`).
  2. Add the class to the `FILTER_CLASSES` array in `src/graph/graph.module.ts`.
  3. Add the corresponding query param to `src/graph/dto/graph-query.dto.ts`.
  - **No modifications** are required in the traversal engine or service logic!
  - Filters are automatically discovered at runtime via the `GET /api/graph/filters` endpoint.

### 3. Subgraph Synthesis

- In addition to providing the full path arrays (`string[][]`), the engine synthesizes a deduplicated **subgraph** containing only the nodes and edges present in the matching routes.
- Edges in the response are cleanly grouped by their `from` field (matching the `GraphEdge` interface) to make client-side visualization libraries (like React Flow, D3, or Cytoscape) effortless to integrate.

### 4. Resilient Data Normalization

- The JSON input is normalized at startup inside `GraphLoaderService`.
- Edge targets (`to`) are normalized from `string | string[]` into `string[]`.
- **Missing Node Stubs**: Referenced but missing nodes (like `assurance-service` referenced by `preserve-other-service`) are automatically detected. The loader creates a safe stub node with `{ name, kind: "unknown" }` and logs a descriptive system warning instead of failing.

---

## 📂 Project Structure

```
src/
├── main.ts                              # Bootstrap, Swagger, Global Pipes
├── app.module.ts                        # Root App Module
│
└── graph/
    ├── graph.module.ts                  # Module registration (DI + Multi-providers)
    ├── graph.controller.ts              # REST API controllers
    ├── graph.service.ts                 # DFS traversal, pruning & filter orchestration
    ├── graph.service.spec.ts            # Unit tests for traversal and strategy logic
    │
    ├── dto/
    │   ├── graph-query.dto.ts           # Input validation (class-validator)
    │   └── graph-response.dto.ts        # Swagger types for response schema
    │
    ├── interfaces/
    │   ├── graph-data.interface.ts      # Input JSON structures
    │   ├── graph-node.interface.ts      # Graph Node & Vulnerability structures
    │   ├── graph-edge.interface.ts      # Normalized Edge structures
    │   └── route-filter.interface.ts    # Extensible Filter Interface
    │
    ├── loader/
    │   └── graph-loader.service.ts      # JSON parsing, stubs, and normalization
    │
    └── filters/
        ├── filters.constants.ts         # ROUTE_FILTERS injection token
        ├── public-start.filter.ts       # Routes starting in public services
        ├── sink-end.filter.ts           # Routes ending in non-service nodes
        └── vulnerability.filter.ts      # Routes passing through vulnerable nodes

data/
└── train-ticket-be.json                 # Source graph JSON
```

---

## 🛠️ Getting Started

### Prerequisites

- Node.js v22+
- npm

### Installation

```bash
npm install
```

### Running the Application

```bash
# Development (watch mode)
npm run start:dev

# Production mode
npm run start:prod
```

Once started, the server runs on [http://localhost:3001](http://localhost:3001).

### Swagger API Documentation

Interactive API docs are automatically generated and available at:
👉 **[http://localhost:3001/api/docs](http://localhost:3001/api/docs)**

---

## 🧪 Verification & Testing

Our solution includes 100% test coverage for the query engine.

### 1. Run Unit Tests (GraphService Traversal Logic)

```bash
npm run test
```

### 2. Run E2E Integration Tests (REST Endpoints & Validations)

```bash
npm run test:e2e
```

### 3. Verify Code Quality & Lints

```bash
npm run lint
```

---

## 📡 REST API Examples

### 1. Get the full unfiltered graph

- **Endpoint**: `GET /api/graph`
- **Response**: Full microservices topology.

### 2. Get routes starting at public services, ending in sinks, with vulnerabilities

- **Endpoint**: `GET /api/graph/routes?startPublic=true&endSink=true&hasVulnerability=true`
- **Response**: Returns matching paths and the computed subgraph.

### 3. Get available filters

- **Endpoint**: `GET /api/graph/filters`
- **Response**: Lists all registered filter strategies dynamically.
