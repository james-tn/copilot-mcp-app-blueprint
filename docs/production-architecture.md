# Production architecture

This document describes how to take the POC in this repo — a single Azure
Container App running the MCP server with a built-in demo dataset — to a
**hardened, enterprise-grade deployment on Azure** that:

- securely connects to **real backend systems** (Pega Blueprint / Platform,
  systems of record),
- **persists state** (blueprints, sessions, audit) in a managed database, and
- is distributed as an **ISV product to many customer tenants** via the
  Microsoft commercial marketplace.

Every concern maps to a **Microsoft / Azure** product so the solution stays
governed, scalable, and observable.

> The POC keeps things deliberately simple: in-memory demo data, optional auth,
> one replica, one tenant. None of that is wrong for a demo — this doc is the
> "what changes when it's real (and multi-tenant)" checklist.

**Contents**

1. [Reference architecture](#1-reference-architecture)
2. [ISV distribution and multi-tenant model](#2-isv-distribution-and-multi-tenant-model)
3. [Component mapping (POC → production)](#3-component-mapping-poc--production)
4. [Backend system connectivity](#4-backend-system-connectivity)
5. [State and data with Cosmos DB](#5-state-and-data-with-cosmos-db)
6. [Personalization and collaboration with Microsoft 365](#6-personalization-and-collaboration-with-microsoft-365)
7. [Security](#7-security)
8. [Scalability and performance](#8-scalability-and-performance)
9. [Observability](#9-observability)
10. [Resilience and DR](#10-resilience-and-dr)
11. [CI/CD and IaC](#11-cicd-and-iac)
12. [Cost notes](#12-cost-notes)
13. [What to change in this repo](#13-what-to-change-in-this-repo)

---

## 1. Reference architecture

The MCP server stays the **center of the system** (it serves data *and* the
widget), but in production it is fronted by a gateway, runs inside a private
network, holds no secrets itself, and reaches backends and a database over
private connectivity.

```mermaid
flowchart TB
    U["User in M365 Copilot"]:::ext

    subgraph EDGE["Edge (public)"]
      direction LR
      FD["Azure Front Door<br/>WAF · TLS · CDN"]:::edge
      APIM["API Management<br/>validate JWT · throttle · quota"]:::edge
    end

    subgraph VNET["Azure Virtual Network — private"]
      ACA["Container Apps<br/>MCP server · KEDA autoscale · min 1"]:::compute
      WORK["Async workers<br/>long-running backend jobs"]:::compute

      subgraph DATA["State and data"]
        direction LR
        COSMOS[("Cosmos DB<br/>blueprints · sessions · audit")]:::data
        REDIS[("Redis<br/>cache · tokens")]:::data
        BLOB[("Blob<br/>exports")]:::data
        KV[("Key Vault<br/>secrets · certs")]:::data
        SB["Service Bus<br/>job queue"]:::data
      end

      subgraph BE["Backend connectivity — private"]
        direction LR
        PEGA["Pega Blueprint /<br/>Platform"]:::backend
        SOR["Systems of record<br/>Workday · ServiceNow · SAP"]:::backend
        LEG["On-prem / legacy<br/>ExpressRoute · VPN · data gateway"]:::backend
      end
    end

    ENTRA["Microsoft Entra ID"]:::id
    OBS["Azure Monitor · App Insights<br/>Log Analytics · Sentinel"]:::obs

    U -->|"OAuth bearer token"| FD --> APIM --> ACA
    ACA --> COSMOS & REDIS & BLOB & KV
    ACA -->|enqueue| SB --> WORK --> COSMOS
    ACA -->|"OBO · Private Link"| PEGA & SOR & LEG
    WORK -->|"OBO · Private Link"| PEGA & SOR
    APIM -. "validate token" .-> ENTRA
    ACA -. "managed identity" .-> ENTRA
    ACA -.-> OBS
    APIM -.-> OBS

    classDef ext fill:#f3f2f1,stroke:#605e5c,color:#000
    classDef edge fill:#dceefb,stroke:#0a66c2,color:#000
    classDef compute fill:#e6e0ff,stroke:#5a1faa,color:#000
    classDef data fill:#d8f5e3,stroke:#107c41,color:#000
    classDef backend fill:#ffe9cc,stroke:#c77700,color:#000
    classDef id fill:#fde7ef,stroke:#c30052,color:#000
    classDef obs fill:#eef1f5,stroke:#444,color:#000
```

**Request lifecycle** — one tool call from Copilot through the production stack:

```mermaid
sequenceDiagram
    autonumber
    actor U as User (Copilot)
    participant FD as Front Door + WAF
    participant GW as API Management
    participant MCP as MCP server
    participant DB as Cosmos DB
    participant BE as Backend (Pega / SoR)
    U->>FD: tool call + OAuth bearer token
    FD->>GW: forward (TLS terminated, WAF passed)
    GW->>GW: validate JWT — iss, aud, scope, exp
    GW->>MCP: authorized request (tenant id from tid claim)
    MCP->>DB: read/write blueprint — query scoped by tenantId
    opt needs live backend data
        MCP->>BE: OBO token exchange, then call backend
        BE-->>MCP: data
    end
    MCP-->>U: structuredContent + ui:// widget
```

---

## 2. ISV distribution and multi-tenant model

The intended go-to-market is **ISV SaaS**: you (the ISV) host **one** MCP service,
publish the agent through the Microsoft commercial marketplace, and **many
customer tenants install it**. Each customer's users run the agent inside *their
own* Microsoft 365 Copilot and connect to **your** MCP server. The server is
therefore **multi-tenant** and must isolate every tenant's data and backend
access.

### 2.1 Topology

```mermaid
flowchart TB
    subgraph MP["Microsoft commercial marketplace"]
      OFFER["ISV offer<br/>declarative agent + MCP plugin<br/>AppSource · M365 + Copilot · Teams"]:::mp
    end

    subgraph TA["Customer tenant A — Contoso"]
      AA["Admin: acquire + grant consent"]:::admin
      UA["Users in M365 Copilot"]:::ext
    end
    subgraph TB2["Customer tenant B — Fabrikam"]
      AB["Admin: acquire + grant consent"]:::admin
      UB["Users in M365 Copilot"]:::ext
    end

    OFFER --> AA
    OFFER --> AB
    UA -->|"token issued by Contoso tenant"| EDGE
    UB -->|"token issued by Fabrikam tenant"| EDGE

    subgraph ISV["ISV-hosted service — single multi-tenant deployment"]
      EDGE["Front Door + APIM<br/>validate token · extract tid · per-tenant quota"]:::edge
      MCP["MCP server<br/>tenant-aware"]:::compute
      STORE[("Cosmos DB<br/>partitioned by tenantId")]:::data
      CFG[("Per-tenant config<br/>backend endpoints · secrets in Key Vault")]:::data
      EDGE --> MCP --> STORE
      MCP --> CFG
    end

    MCP -->|"per-tenant backend · OBO / Private Link"| BEA["Contoso backend<br/>Pega / SoR"]:::backend
    MCP -->|"per-tenant backend"| BEB["Fabrikam backend<br/>Pega / SoR"]:::backend

    classDef mp fill:#dceefb,stroke:#0a66c2,color:#000
    classDef admin fill:#fff4ce,stroke:#9d5d00,color:#000
    classDef ext fill:#f3f2f1,stroke:#605e5c,color:#000
    classDef edge fill:#dceefb,stroke:#0a66c2,color:#000
    classDef compute fill:#e6e0ff,stroke:#5a1faa,color:#000
    classDef data fill:#d8f5e3,stroke:#107c41,color:#000
    classDef backend fill:#ffe9cc,stroke:#c77700,color:#000
```

Key point: there is **one app registration** (a *multi-tenant* Entra app,
`signInAudience = AzureADMultipleOrgs`) and **one MCP deployment**. Customer
tenants don't get their own copy of your infrastructure — they get a **service
principal** in *their* tenant when they consent, and their users' tokens carry
their own `tid` (tenant id) claim, which your service uses to isolate everything.
This is the same **"entra-as-generic"** pattern the POC already uses
([security-and-login.md](security-and-login.md)) — Microsoft identity with no
per-tenant provisioning on the identity side.

### 2.2 Distribution and onboarding

```mermaid
sequenceDiagram
    autonumber
    participant ISV as ISV (Partner Center)
    participant MP as Marketplace / Admin Center
    participant ADM as Customer admin
    participant ENT as Customer Entra ID
    participant USR as Customer user
    participant SVC as ISV MCP service
    ISV->>MP: Publish offer (agent + MCP plugin, multi-tenant app)
    ADM->>MP: Acquire / deploy the app to the tenant
    ADM->>ENT: Grant admin consent to the multi-tenant app
    ENT-->>ENT: Create service principal in customer tenant
    Note over SVC: (optional) ISV onboards tenant —<br/>provision Cosmos partition + backend config
    USR->>USR: Open the agent in Copilot
    USR->>ENT: Sign in / consent (silent if admin-granted)
    ENT-->>USR: OAuth token (carries tid = customer tenant)
    USR->>SVC: Tool call + token
    SVC->>SVC: Validate token, read tid, scope data + backend to that tenant
    SVC-->>USR: Tenant-isolated blueprint + widget
```

**Publishing** (Microsoft commercial marketplace via **Partner Center**):

- Package the declarative agent + MCP plugin (`appPackage/`) and publish it as a
  **Microsoft 365 / Copilot** app offer (AppSource), optionally also listed in the
  **Teams** store. The same package can be sideloaded for pilots before listing.
- The package embeds your MCP endpoint and the **OAuth client `reference_id`**
  (Teams Developer Portal). It contains **no per-customer values** — every
  customer installs the identical package.
- Choose a transactability model: free / bring-your-own-license, or a
  **transactable SaaS offer** with Microsoft handling billing (see §2.6).
- Expect **Microsoft 365 app certification / Publisher Verification** for store
  listing; budget for the security review.

**Customer install**: a tenant admin acquires the app, grants **admin consent**
to the multi-tenant Entra app once (so all users get silent SSO), and assigns it
to users (or enables self-install). Conditional Access in the *customer's* tenant
then governs who can use it.

### 2.3 Tenant isolation models

Pick an isolation strategy per resource. Most ISVs start **pooled** and offer a
**silo** tier for premium/regulated customers (the "bridge" model).

| Model | Compute | Data (Cosmos) | Pros | Use when |
| --- | --- | --- | --- | --- |
| **Pool** (shared) | one MCP deployment for all tenants | one account, **partition key = `tenantId`** | cheapest, simplest ops, elastic | most tenants; SMB/standard tier |
| **Silo** (dedicated) | tenant-dedicated app/env | tenant-dedicated DB or account | strong blast-radius + residency isolation | regulated / large / data-residency tenants |
| **Bridge** (hybrid) | shared compute, **dedicated data** for some | per-tenant DB for premium, pooled for the rest | balance cost vs isolation | mixed customer base |

**Non-negotiable for the pooled model**: every Cosmos query is **scoped by the
`tenantId`** derived from the validated token's `tid` claim — never from anything
the client sends. Treat a missing/mismatched `tid` as a hard auth failure. This
is the primary guard against cross-tenant data leaks.

### 2.4 Per-tenant backend connectivity (the hard part)

Your users connect to the MCP server at the ISV — but **whose backend** does the
MCP server then call? Two patterns, often combined:

```mermaid
flowchart LR
    subgraph ISVnet["ISV MCP service"]
      MCP["MCP server<br/>tenant-aware"]:::compute
      CFG[("Per-tenant config + Key Vault<br/>endpoint · credential ref")]:::data
      MCP --> CFG
    end
    MCP -->|"Model 1: ISV-operated backend"| ISVBE["ISV backend / Pega<br/>(shared, multi-tenant)"]:::backend
    MCP -->|"Model 2: customer-owned backend"| CBE["Customer's Pega / SoR<br/>(per tenant)"]:::backend
    CBE -. "allow-list ISV egress IP<br/>or Private Link / VPN" .-> MCP

    classDef compute fill:#e6e0ff,stroke:#5a1faa,color:#000
    classDef data fill:#d8f5e3,stroke:#107c41,color:#000
    classDef backend fill:#ffe9cc,stroke:#c77700,color:#000
```

- **Model 1 — ISV-operated backend.** The ISV runs the backend centrally (e.g.
  your own Pega instance / aggregation layer). Simplest connectivity, but
  tenant data flows through ISV-controlled systems — be explicit about that in
  your data-handling terms.
- **Model 2 — customer-owned backend (BYO-backend).** Each tenant points at
  *their own* Pega / system of record. The MCP server keeps **per-tenant
  connection config** keyed by `tenantId` — endpoint + a **credential reference**
  to a Key Vault secret (or, better, a federated identity). Connectivity options:
  - the customer **allow-lists your stable egress** (NAT Gateway IP / Front Door)
    and you call their public-but-restricted API;
  - or **per-tenant private connectivity** (Private Link service, or
    Site-to-Site VPN) for customers that won't expose a public endpoint.
  - For identity, prefer **OBO** so the user's identity flows to the customer's
    backend (it enforces its own authz); fall back to a **per-tenant app
    credential** when no federation exists.
- **Onboarding a tenant's backend** becomes a first-class step: capture the
  endpoint + credentials at install/admin-config time, store the secret in Key
  Vault (reference it by `tenantId`), and validate connectivity before enabling
  live tools. Until then, the tenant can run against demo/sample data.

### 2.5 Identity and consent specifics

- **Multi-tenant Entra app** (`AzureADMultipleOrgs`) + the **`/common`** or
  `/organizations` authorize/token endpoints, with **user-consentable** Graph
  scopes (e.g. `User.Read`). This gives Microsoft SSO across all customer tenants
  with **no admin consent required by default** — though most customers will
  grant **admin consent** once for silent rollout.
- The token your server validates carries `tid` (tenant) and the user's `oid`
  (object id). Use `tid` for isolation and `oid` for per-user audit.
- **Guest/B2B users**: a guest's token carries the *resource* tenant's `tid`;
  decide whether guests are in scope and document it.
- Each customer's **Conditional Access** (MFA, device compliance, network) applies
  automatically — you inherit their controls without configuring anything.

### 2.6 Metering, billing, and tenant lifecycle

- **Billing**: a **transactable SaaS offer** in the marketplace lets Microsoft
  handle purchase, invoicing, and the customer's existing Azure/M365 agreement.
  For usage-based pricing, emit usage to the **Azure Marketplace Metering
  Service**; for seat-based, reconcile against assigned licenses.
- **Per-tenant usage** is tracked from the `audit` container (tool calls,
  blueprints created, exports) — feeds both billing and capacity planning.
- **Lifecycle**: **onboard** (create the tenant's Cosmos partition + backend
  config on first admin consent / subscription webhook), **suspend** (honor
  marketplace cancellation webhooks), and **offboard** (delete the tenant's
  partition + Key Vault secrets to meet data-deletion/GDPR obligations).
- **Data residency**: regulated customers may require their data in a specific
  region — satisfy with **region-pinned silos** or **Cosmos multi-region** with
  the tenant pinned to a region.

### 2.7 Noisy-neighbor and fairness

- **Per-tenant rate limits and quotas at APIM** (keyed on `tid`) so one tenant
  can't starve others.
- **Per-tenant Cosmos throughput** awareness — watch for hot partitions; a very
  large tenant may warrant a dedicated container/account (the silo tier).
- Tag telemetry with `tenantId` so dashboards and alerts are per-tenant.

---

## 3. Component mapping (POC → production)

| Concern | POC (this repo) | Production on Azure |
| --- | --- | --- |
| Compute | 1× Azure Container App, `min-replicas=1` | Container Apps with **KEDA** autoscale (HTTP + queue rules), multi-replica, zone-redundant |
| Tenancy | single tenant, demo data | **multi-tenant**: `tid`-scoped data + per-tenant config (see §2) |
| Ingress / edge | ACA public ingress | **Azure Front Door** (WAF, TLS, global anycast, caching) → **API Management** |
| API gateway | none | **Azure API Management** — JWT validation, **per-tenant** rate-limit/quota, request/response policy |
| Identity | optional bearer (3 modes) | **Microsoft Entra ID** multi-tenant app; **managed identities** for all Azure-to-Azure calls (no secrets) |
| Secrets | env vars / Key Vault optional | **Azure Key Vault** (referenced by managed identity; per-tenant backend creds) |
| **State / data** | in-memory dict | **Azure Cosmos DB** (blueprints, sessions, audit) + **Redis** (cache) + **Blob** (exports) |
| **Backend integration** | seeded demo data | **Private Endpoints** / per-tenant connectivity to Pega and SoR; **on-prem data gateway**; **ExpressRoute/VPN** |
| **M365 personalization** | seeded sample personas/data | **WorkIQ** + **Microsoft Graph** (OBO, as the user) to ground blueprints in the tenant's real people, processes, and systems — and to collaborate back into Teams/Outlook/SharePoint/Planner (see §6) |
| Networking | public | **VNet-integrated** Container Apps, **Private Endpoints**, **Private DNS**, NSGs, no public data plane |
| Observability | container logs | **Application Insights** (OpenTelemetry traces), **Log Analytics**, **Azure Monitor** alerts, per-tenant dashboards |
| Security posture | — | **Microsoft Defender for Cloud** (CSPM + container/CWPP), **Microsoft Sentinel** (SIEM) |
| CI/CD | manual `deploy_azure.sh` | **GitHub Actions / Azure DevOps** → ACR build → staging → canary → prod, IaC via **Bicep** |
| Distribution | manual sideload | **Microsoft commercial marketplace** (Partner Center), transactable SaaS offer |
| Config / flags | env vars | **Azure App Configuration** (typed settings + feature flags) |

---

## 4. Backend system connectivity

In production the MCP tools stop returning seeded data and instead **call real
backends** — Pega Blueprint/Platform APIs to read or generate blueprints, and
**systems of record** (Workday, ServiceNow, SAP, mainframe, etc.) for the data
objects and integrations a blueprint references. This is the most security-
sensitive part of the system, because the MCP server becomes a **confused-deputy
risk**: it acts on behalf of a user against privileged backends. In the ISV model
the backend is often **per-tenant** (§2.4).

**Connectivity**

- **Private Endpoints + Private DNS** for any backend exposed on Azure / Private
  Link. The MCP server's egress never traverses the public internet for these.
- **Azure API Management (outbound)** or a dedicated egress gateway in front of
  third-party / SaaS APIs (Pega Cloud, Workday, ServiceNow) so retries,
  circuit-breaking, caching, request signing, and per-backend throttling live in
  one place.
- **ExpressRoute or Site-to-Site VPN** for on-prem / legacy; for document /
  desktop-style sources use the **on-premises data gateway**.
- **NSGs + UDRs + Azure Firewall / NAT Gateway** to constrain egress to an
  explicit allow-list of backend FQDNs/IPs (deny-by-default egress) and present a
  **stable egress IP** customers can allow-list.

**Identity and authorization to backends (don't store passwords)**

- Prefer the **OAuth 2.0 On-Behalf-Of (OBO)** flow: exchange the user's Copilot
  token (via Entra ID) for a downstream token scoped to the specific backend, so
  the backend sees the **real user** and enforces *its own* authorization —
  least privilege end-to-end and per-user audit at the SoR.
- For system-to-system calls with no user context, use a **managed identity** or
  **workload-identity federation** to the backend's IdP — never a static client
  secret. If a secret is unavoidable (legacy basic-auth), keep it in **Key Vault**
  and rotate it. In multi-tenant mode, key the secret by `tenantId`.
- Scope tokens narrowly (one audience/scope per backend). Cache them in Redis
  with their natural TTL; never log them.

**Resilience around backends**

- Treat every backend call as fallible: timeouts, retries with jitter, and a
  **circuit breaker** (Polly-style) so a slow SoR can't exhaust MCP replicas.
- Use **idempotency keys** for any write/generate operation.
- Offload long-running backend work (e.g. "generate blueprint") to an **async
  pattern**: enqueue to **Azure Service Bus / Storage Queue**, return a job id,
  and let a **KEDA**-scaled worker process it — the widget polls or is notified.
  This keeps the synchronous MCP path fast (Copilot has tool timeouts).

**Data minimization**

- Pull only the fields the widget needs; don't mirror entire SoR records.
- Classify/tag sensitive fields; apply **Microsoft Purview** for governance /
  lineage if regulated data flows through.

---

## 5. State and data with Cosmos DB

The POC holds blueprints in a process-local dict — fine for one replica, but it
**won't survive a restart or scale-out**, and it can't isolate tenants.
Production needs durable, shared, **tenant-partitioned** state. **Azure Cosmos
DB** (NoSQL API) is the right primary store: low-latency, elastic, multi-region,
serverless or autoscale, with a clean JSON document model that maps directly to
the blueprint payloads this server already produces.

**Why Cosmos DB here**

- The blueprint *is* a JSON document (`id`, `caseTypes[]`, `personas[]`,
  `dataObjects[]`, …) — a natural fit; no ORM impedance.
- Per-partition scale + single-digit-ms reads keep synchronous MCP tool calls
  within Copilot's latency budget.
- **Autoscale RU/s** (or **serverless** for dev) tracks load and cost.
- **Multi-region writes + 99.999% SLA** for global / HA, and **per-tenant region
  pinning** for data residency.
- Native **TTL** for ephemeral data (sessions, idempotency keys, draft state).

**Suggested containers (collections)**

| Container | Partition key | Holds | Notes |
| --- | --- | --- | --- |
| `blueprints` | `/tenantId` | the blueprint documents | the durable, tenant-isolated replacement for `_store` |
| `sessions` | `/tenantId` (or `/sessionId`) | per-conversation working state, "current blueprint" pointer | **TTL** to expire; replaces `_current_id` |
| `tenantConfig` | `/tenantId` | per-tenant backend endpoints, feature flags, Key Vault secret refs | drives §2.4 connectivity |
| `audit` | `/tenantId` | who created/edited/exported what, and which tool ran | append-only; feeds Sentinel + billing |
| `idempotency` | `/key` | dedupe keys for generate/write ops | short **TTL** |

**Access pattern (maps onto today's code)**

- `server/pega_mcp/store.py` becomes a thin repository over Cosmos: `get()`,
  `create_blueprint()`, `view_*()` read/write documents instead of a dict. The
  view/tool layer above it is unchanged — a clean seam already exists.
- Connect with the **Cosmos DB SDK using a managed identity** (Entra RBAC data
  plane: `Cosmos DB Built-in Data Contributor`) — **no connection strings/keys**.
- **Always pass `tenantId` (from the validated `tid` claim) as the partition
  key** and include it in every query predicate — the core multi-tenant guard.

**Complementary stores**

- **Azure Cache for Redis** — hot blueprint cache, backend-token cache, optional
  session affinity; takes read pressure off Cosmos.
- **Azure Blob Storage** — the generated **PDF / Excel / Blueprint exports** (the
  POC builds these in-process; in prod write them to Blob and hand out short-lived
  **SAS** / signed URLs instead of streaming through the server).
- **Azure Service Bus / Storage Queue** — async job queue for long backend calls.

> Relational alternative: if you need strong cross-entity transactions or heavy
> reporting joins, **Azure SQL / PostgreSQL Flexible Server** is the swap-in. For
> this document-shaped, high-read, multi-tenant workload, Cosmos DB is the better
> default.

---

## 6. Personalization and collaboration with Microsoft 365

The POC seeds every blueprint from one generic sample. The single biggest
experience upgrade is to **ground the blueprint in the customer's own world** —
their real processes, people, systems, and decisions — using the **Microsoft 365
data the signed-in user already has access to**. Because the agent runs *inside*
M365 Copilot, it can reach that context two complementary ways:

- **WorkIQ** (`ask_work_iq`) — natural-language **workplace intelligence** over the
  user's emails, meetings, Teams chats, documents, and people, synthesized from
  the **Microsoft Graph semantic index**. One question in, a grounded answer out.
- **Microsoft Graph** (direct REST) — **structured, deterministic** reads/writes:
  profile, org chart, People, calendar, presence, files, mail, Teams, Planner.

> **The key property: both run *on behalf of the signed-in user* (OBO) and inherit
> that user's existing M365 permissions.** The agent can never see more than the
> user already can — personalization with **no new data-access surface** and least
> privilege by construction. It also fits the multi-tenant model (§2) for free:
> the user's token already carries `tid`, so every M365 read is tenant-scoped.

### 6.1 Personalization — grounding a blueprint in the customer's reality

Instead of starting from a banking sample, the agent asks the organization's own
data "how do *we* do this today?" and proposes a starting point built from real
context.

```mermaid
flowchart LR
    U["User starts a blueprint<br/>in M365 Copilot"]:::ext
    MCP["MCP server<br/>(tenant-aware)"]:::compute

    subgraph M365["Microsoft 365 — accessed as the signed-in user (OBO)"]
      direction TB
      WIQ["WorkIQ · ask_work_iq<br/>synthesized org intelligence"]:::m365
      GRAPH["Microsoft Graph<br/>profile · org chart · people<br/>presence · files · mail · Teams"]:::m365
      IDX[("Graph semantic index<br/>emails · meetings · chats<br/>SharePoint · OneDrive")]:::data
      WIQ --> IDX
    end

    U -->|"tool call + token (tid, oid)"| MCP
    MCP -->|"OBO: 'how do we do card servicing today?'"| WIQ
    MCP -->|"OBO: org chart · people · presence"| GRAPH
    WIQ -->|"grounded process context"| MCP
    GRAPH -->|"real personas + SMEs"| MCP
    MCP -->|"AI-suggested draft (with provenance)<br/>— user confirms before it is saved"| U

    classDef ext fill:#f3f2f1,stroke:#605e5c,color:#000
    classDef compute fill:#e6e0ff,stroke:#5a1faa,color:#000
    classDef m365 fill:#dceefb,stroke:#0a66c2,color:#000
    classDef data fill:#d8f5e3,stroke:#107c41,color:#000
```

What each part of the blueprint can be personalized from:

| Blueprint element | M365 source (WorkIQ / Graph, as the user) | What it personalizes |
| --- | --- | --- |
| **Purpose / description** | WorkIQ over SharePoint SOPs, emails, meeting notes | Real intent and scope instead of a generic stub |
| **Case types & stages** | WorkIQ over the existing **process doc / PRD**; meeting **decisions & action items** | Stages mirror the org's *actual* process, not a template |
| **Personas** | **Graph** `/me`, `/me/manager`, `/me/directReports`, org chart, People API; WorkIQ "who owns X?" | Real roles, departments, reporting lines, named SMEs |
| **Data objects / systems of record** | WorkIQ "what systems do we use for card accounts?" → Workday/ServiceNow/SAP cited in docs | The SoR list reflects the tenant's real landscape |
| **Approvers / reviewers** | **Graph** presence + People; WorkIQ "who approves limit changes?" | The right approver assigned to each stage |
| **Integrations / inbound events** | WorkIQ over architecture docs; Graph/Copilot **connectors** index | Surfaces the org's real integration points |

**Guardrail — intelligence, not authority (ties to the provenance work).** WorkIQ
and Graph output are *suggestions the user confirms*, never silently authoritative.
Surface them as "Based on your team's docs, here's a suggested starting point,"
show the **source**, and mark each field **AI-suggested vs user-confirmed** using
the same `origin`/provenance pattern the server already tracks. Nothing derived
from org data is written into the durable blueprint until the user accepts it.

### 6.2 People and the org graph → real personas

- **Graph** `/me`, manager chain, direct reports, `memberOf` groups → seed personas
  with **real titles, departments, and reporting structure** (no more "Persona 1").
- **People API** (`/me/people`) ranks the colleagues most relevant to the user →
  suggested collaborators and SMEs for a case type.
- **Presence API** → who is **available right now** to review or approve a stage.
- **Profile photos + display names** rendered in the widget for a recognizable,
  personalized UI.

### 6.3 Beyond reading — collaboration and action across M365

A few more things this solution can take advantage of: the blueprint shouldn't
stop at design — it can flow into the tools the team already lives in.

```mermaid
flowchart LR
    BP["Blueprint<br/>(in the widget)"]:::compute
    OUT["MCP write tools<br/>(user-initiated, allow-listed, OBO)"]:::compute
    BP --> OUT
    OUT -->|"email summary / PDF · approval requests"| MAIL["Outlook · Mail.Send"]:::m365
    OUT -->|"post for review · Adaptive Card approvals · review meeting"| TEAMS["Microsoft Teams"]:::m365
    OUT -->|"persist export · version history · co-author"| SP["SharePoint / OneDrive"]:::m365
    OUT -->|"stages/steps → tasks"| PLAN["Planner / To Do / Project"]:::m365
    OUT -->|"live, in-sync component"| LOOP["Microsoft Loop"]:::m365
    OUT -->|"schema · flow skeleton"| PP["Power Platform<br/>Dataverse · Power Automate"]:::m365
    OUT -->|"labels · DLP"| PURV["Microsoft Purview"]:::data

    classDef compute fill:#e6e0ff,stroke:#5a1faa,color:#000
    classDef m365 fill:#dceefb,stroke:#0a66c2,color:#000
    classDef data fill:#d8f5e3,stroke:#107c41,color:#000
```

- **Outlook / Mail** (`Mail.Send`) — email the generated summary/PDF to
  stakeholders; send **stage-owner approval requests**; "share this with my manager."
- **Microsoft Teams** — post the blueprint to a **channel** for review
  (`ChannelMessage.Send`); **Adaptive Card** approve/return a stage inline; spin up
  a **review meeting**, then pull its **transcript** back through WorkIQ as new
  requirements (a closed feedback loop); co-design in a group chat with the agent.
- **SharePoint / OneDrive** (`Files.ReadWrite`) — persist the **PDF/Excel export**
  (already built in-process) to the team's library with **version history and
  co-authoring** instead of a transient download; also the richest **grounding**
  source for §6.1.
- **Planner / To Do / Project** — turn blueprint **stages/steps into a plan or
  project tasks** so the blueprint becomes an actionable delivery backlog.
- **Microsoft Loop** — embed the live blueprint as a **Loop component** that stays
  in sync across chats, docs, and meetings.
- **Graph / Copilot connectors** — index the customer's **external SoR** (their
  Pega, ticketing, CRM) into the **Graph semantic index**, so WorkIQ grounding
  spans line-of-business data, not just M365.
- **Power Platform** — export data objects → a **Dataverse table schema**; export a
  case type → a **Power Automate** flow skeleton, bridging design to a runnable app.
- **Microsoft Purview** — apply **sensitivity labels** to exported blueprints and
  enforce **DLP** when org data flows into them (compliance for regulated tenants).
- **Viva Goals** — align a blueprint to the team's **OKRs**; Viva Insights for
  adoption analytics.

### 6.4 Architecture and implementation notes

- **New MCP tools**, each a thin wrapper over WorkIQ/Graph behind the *same tool
  seam* the server already uses — e.g. `ground_blueprint(context_query)`,
  `suggest_personas_from_org()`, `share_to_teams(id)`, `email_summary(id, to)`,
  `save_to_sharepoint(id)`, `create_plan(id)`. **Reads** ground the design;
  **writes** are **explicit, user-initiated, and allow-listed** (the prompt-
  injection guard in §7 applies — never let a tool result trigger a silent send).
- **Identity / OBO** — all M365 calls use the **On-Behalf-Of** flow: exchange the
  user's Copilot token for a Graph token so every read/write happens **as the
  user**, honoring their permissions and the tenant's Conditional Access. Avoid
  app-only Graph for personalization — it would over-privilege the service.
- **Consent / scopes** (multi-tenant, §2.5) — add **delegated** Graph scopes
  **incrementally**: start read-only and user-consentable (`User.Read`,
  `People.Read`, `Calendars.Read`, `Files.Read`), and add write scopes
  (`Mail.Send`, `Files.ReadWrite`, `ChannelMessage.Send`) **only for features a
  tenant turns on**. Keep them optional so the core agent works without them; most
  warrant a one-time **admin consent**.
- **WorkIQ vs direct Graph** — use **WorkIQ for fuzzy, synthesized, cross-source**
  questions ("how do we do X today?"); use **direct Graph for structured,
  deterministic** reads/writes (org chart, send mail). They are complementary, not
  either/or.
- **Latency / async** — WorkIQ synthesis can be slow, so run grounding on the
  **async job pattern** from §4: create the blueprint immediately with sample data,
  kick off grounding in a **KEDA worker**, and let the widget refresh with
  personalized suggestions when ready — keeping the synchronous tool call inside
  Copilot's timeout.
- **Privacy / data minimization** — treat M365-derived content as **transient
  grounding**: pull only what's needed, show provenance, and **don't persist PII**
  into the durable store unless the user accepts it (then label it via Purview).
  **Audit** every M365 read/write to the `audit` container with the user's `oid` +
  `tid`.
- **Caching** — cache org-chart/persona lookups in **Redis** (per user, short TTL)
  to avoid repeat Graph calls on every tool invocation.

---

## 7. Security

Defense in depth, mapped to Microsoft products:

**Identity**
- **Microsoft Entra ID** is the single identity authority. Copilot → MCP uses
  OAuth (see [security-and-login.md](security-and-login.md)); MCP → backends uses
  **OBO**; MCP → Azure resources uses **managed identity**. Goal: **zero static
  secrets** in the running system.
- **Conditional Access** (the customer's) governs who reaches the agent; **PIM**
  for just-in-time admin access to the ISV subscription.

**Network**
- Container Apps **VNet integration**; data plane reachable only via **Front Door
  → APIM**. **Private Endpoints** for Cosmos, Key Vault, Storage, Redis, and
  backends. **Private DNS zones**. **Deny-by-default egress** via Azure Firewall.

**Edge**
- **Azure Front Door WAF** (or **Application Gateway WAF**) with OWASP rules, bot
  protection, and rate-limiting in front of everything public.
- **APIM** validates the JWT (issuer, audience, scope, expiry) **and the `tid`**
  *before* the request reaches the MCP server — the server's own check becomes
  belt-and-suspenders.

**Secrets and keys**
- **Azure Key Vault** (RBAC, soft-delete, purge protection) for any unavoidable
  secret/cert, referenced via managed identity. Per-tenant backend creds are
  keyed by `tenantId`. Rotation automated.

**Data protection**
- Encryption in transit (TLS 1.2+) and at rest (platform-managed or
  **customer-managed keys** in Key Vault). **Tenant isolation enforced in every
  Cosmos query.** **Microsoft Purview** for classification / DLP on regulated data.

**Posture and detection**
- **Microsoft Defender for Cloud** — CSPM + Defender for Containers (image scan,
  runtime threat detection). **Microsoft Sentinel** — SIEM/SOAR over the audit
  container, APIM, Entra, and platform logs. Pin image digests; scan in CI
  (**Microsoft Defender for DevOps** / Trivy).

**Prompt-injection and tool-abuse hardening** (agent-specific)
- Treat backend/tool outputs as untrusted; never let them silently escalate
  privilege. Enforce per-tool authorization **server-side** (don't rely on the
  model). Log every tool invocation to `audit` with the calling identity + `tid`.
  Allow-list any tool that triggers a backend write.

---

## 8. Scalability and performance

- **KEDA autoscaling** on Container Apps: scale on concurrent HTTP requests and on
  queue depth for the async workers. Keep **`min-replicas ≥ 1`** (warm) — the one
  POC setting worth preserving, because Copilot times out on cold starts.
- **Stateless replicas**: with state in Cosmos/Redis, any replica serves any
  tenant's request; scale horizontally without affinity.
- **Cosmos autoscale RU/s** + good partition keys to avoid hot partitions; cache
  hot reads in Redis. Watch for a single large tenant creating a hot partition.
- **Front Door caching** for the widget HTML / static assets (one immutable file
  per release) at the edge.
- **Async offload** of long backend operations so synchronous tool calls stay
  well under Copilot's timeout.
- **Zone redundancy** for the Container Apps environment and Cosmos; **multi-
  region** (Front Door + Cosmos multi-region) for global or DR-critical use.

---

## 9. Observability

- **Application Insights** with **OpenTelemetry** from the FastMCP/uvicorn app:
  distributed traces that stitch *Copilot → APIM → MCP → backend → Cosmos*, so you
  can see exactly where a slow tool call spends its time.
- **Log Analytics** as the sink; **Azure Monitor** alerts on latency, 5xx, auth
  failures, RU throttling (Cosmos 429s), and backend circuit-breaker trips.
- **Per-tenant dashboards/Workbooks** (tag telemetry with `tenantId`): tool-call
  volume, p95 latency per tool, blueprint create rate, backend error rate.
- Correlate a Copilot request id through every hop; emit structured audit events
  to the `audit` container and Sentinel.

---

## 10. Resilience and DR

- **Multi-zone** by default; **multi-region** for critical workloads (Front Door
  routes, Cosmos multi-region writes, geo-redundant Blob).
- Define **RPO/RTO**; Cosmos continuous backup (point-in-time restore) and Key
  Vault soft-delete / purge-protection support them.
- **Health probes** (`/healthz` already exists) drive Container Apps restarts and
  Front Door origin health.
- **Graceful backend degradation**: when a SoR is down, serve cached/last-known
  data and surface a clear "live data unavailable" state rather than failing the
  whole tool call.

---

## 11. CI/CD and IaC

- **Infrastructure as Code with Bicep** (or Terraform): VNet, Container Apps env,
  Cosmos, Key Vault, APIM, Front Door, Private Endpoints, RBAC — all reproducible.
- **GitHub Actions / Azure DevOps** pipeline:
  1. build + type-check the widget, run the server smoke test;
  2. build the image in **ACR** (pinned base, vulnerability scan);
  3. deploy to a **staging** Container Apps revision;
  4. **canary / traffic-split** to a percentage of traffic, watch App Insights;
  5. promote to 100%; auto-rollback on alert.
- Keep `scripts/deploy_azure.sh` as the **dev/quickstart** path; the pipeline is
  the governed prod path.
- Regenerate and re-publish the marketplace package (`./scripts/build_package.sh`)
  as part of release when tools or the endpoint change.

---

## 12. Cost notes

- **Container Apps**: pay for the warm `min-replicas` + per-request scale. One
  small always-on replica is inexpensive and removes cold starts.
- **Cosmos DB**: **serverless** for dev / low traffic; **autoscale RU/s** for
  prod. TTL keeps `sessions`/`idempotency` small. Pooled tenancy keeps per-tenant
  cost low; silo tiers cost more (price accordingly).
- **Front Door / APIM / Defender / Sentinel** are the main fixed costs — adopt
  them when the workload is genuinely production / regulated.
- Right-size with **Azure Advisor** + cost alerts; scale non-prod to zero where
  cold starts are acceptable (i.e. *not* the Copilot-facing prod app).

---

## 13. What to change in this repo

1. **State**: replace the in-memory `_store`/`_current_id` in
   [server/pega_mcp/store.py](../server/pega_mcp/store.py) with a Cosmos DB
   repository (managed-identity auth), partitioned by `tenantId`. Keep the
   `view_*` seam intact.
2. **Multi-tenancy**: derive `tenantId` from the validated token's `tid` claim in
   the auth layer ([server/pega_mcp/auth.py](../server/pega_mcp/auth.py)); thread
   it through every store/backend call; reject missing/mismatched `tid`.
3. **Backends**: replace the seeded data in
   [server/pega_mcp/data.py](../server/pega_mcp/data.py) with backend clients
   (Pega/SoR) behind the same interface; add per-tenant config lookup, OBO token
   exchange + Polly-style resilience; move long calls to an async worker.
4. **Exports**: write PDFs/Excel to **Blob** and return signed URLs instead of
   streaming from the server.
5. **Auth**: turn on auth (`PEGA_MCP_REQUIRE_AUTH=true`), keep the **multi-tenant**
   Entra app, and front it with APIM JWT validation; managed identity for all
   Azure calls.
6. **Network**: VNet-integrate the Container App; add Private Endpoints + Front
   Door + WAF; present a stable egress IP for customer allow-listing.
7. **Distribution**: list the package on the **Microsoft commercial marketplace**
   (Partner Center); add subscription/metering webhooks for tenant lifecycle.
8. **Pipeline**: codify everything in Bicep + a CI/CD pipeline; add App
   Insights/OpenTelemetry and Defender/Sentinel.
9. **M365 personalization** (§6): add WorkIQ + Microsoft Graph tools behind the
   existing tool seam to ground blueprints in the tenant's real people/process/
   systems and to collaborate back into Teams/Outlook/SharePoint/Planner — all via
   **OBO** (as the user), with incremental delegated scopes and provenance on every
   AI-suggested field.

See [architecture.md](architecture.md) for the MCP-Apps rendering contract and
[security-and-login.md](security-and-login.md) for the Copilot↔MCP auth design.
