# BrokerDesk Phase 0A — Product and Workflow Foundation

Status: Approved baseline; later refinements are captured in Phases 0C–0E  
Purpose: Preserve the original BrokerDesk business intent, actors, MVP workflows, privacy boundaries, and day-one operating model.

## 1. Product definition

BrokerDesk is the B2B operating surface of Nakshatra. It extends the B2C platform and reuses the same customer identity, portfolio, media, verification, consent, permissions, storage, and progressive disclosure foundations.

BrokerDesk helps matrimonial brokers replace fragmented WhatsApp, Excel, phone-call, manual-reminder, and memory-based work with a simple, trusted relationship workflow. It supports the broker's judgement and conventional conversations rather than attempting to replace them.

The central business object is the **Introduction**. BrokerDesk is not a generic CRM.

## 2. Product outcomes

- A broker can manage hundreds or thousands of customer relationships from one system.
- A customer maintains one authentic portfolio and sees Introductions from every broker in one Nakshatra dashboard.
- Brokers can invite, review, introduce, follow up, record conventional responses, and manage renewals.
- Customers control profile ownership, final decisions, permanent blocks, and private disclosures.
- Cross-agency activity stays invisible to brokers.
- Every dashboard item answers “What should I work on now?”

## 3. Actors

### Customer

- Create or claim one Nakshatra account.
- Own and maintain one portfolio.
- Upload photos and horoscope information.
- Maintain preferences and privacy choices.
- Review Introductions from all brokers.
- Select one broker route when showing interest in a broker-originated Introduction.
- Approve private contact/family disclosure.

### Agency owner/admin

- Register and verify the business.
- Invite employees and assign access.
- Configure operational policies.
- Access only the agency's relationships and routes.

### Broker/agent

- Invite and follow up with assigned customers.
- Review portfolio readiness.
- See explainable potential matches within the agency's customer base.
- Send and manage the agency's Introduction routes.
- Record phone, WhatsApp, and in-person responses with provenance.
- Manage tasks and renewals according to assignment.

### Nakshatra workers/support

- Run reminders, expiry, notification, scanning, and projection jobs under narrow service authority.
- Use explicit, audited support access only when later approved.

## 4. MVP information architecture

BrokerDesk primary navigation:

- Dashboard
- Customers
- Introductions
- Tasks
- Settings

Customer primary navigation:

- Home
- My Portfolio
- Introductions
- My Brokers
- Access and Privacy
- Account

Avoid separate menus for objects that do not represent regular work. Renewals, approvals, imports, team management, and verification appear as contextual queues/settings rather than bloating top-level navigation.

## 5. Broker onboarding workflow

1. Reuse the existing Nakshatra signup/login flow while preserving BrokerDesk product intent through authentication.
2. Create a pending agency workspace; do not grant verified-business claims automatically.
3. Collect simple staged business details: legal/trading name, business type, address/jurisdiction, owner/authorized representative, contact details, operating locations, and service information.
4. Verify the representative through Didit where appropriate.
5. Verify business existence and representative authority using jurisdiction-appropriate registration/tax/licence documents and authoritative sources where available.
6. Configure the owner account and initial security requirements.
7. Let the owner invite employees and assign role, capability, customer/team scope, and start/end dates.
8. Activate sensitive BrokerDesk capabilities only after required verification and consent conditions pass.

Verification badges state exactly what has been verified: identity, business existence, business control, contact/domain, or another specific check.

## 6. Day-one onboarding of 100 customers

The broker can begin with a guided private import without creating shareable duplicate profiles.

1. Download or use a validated import template.
2. Upload a bounded CSV/XLSX batch into agency-private staging.
3. Validate each row without globally searching or revealing existing Nakshatra accounts.
4. Create private intake records and show clear row errors/actions.
5. Send secure invitations in controlled batches.
6. Customer signs in or signs up, proves the invited contact, reviews the broker relationship, and gives consent.
7. If the customer already has Nakshatra, link the private agency relationship to the existing canonical candidate without exposing other brokers.
8. Customer completes/publishes the one canonical portfolio.
9. Broker reviews readiness but does not own or copy the portfolio.
10. Only claimed, consented, eligible customers can be introduced.

Unclaimed intake data expires under a documented retention policy and cannot be used for matching or sharing.

## 7. Core operating workflow

```text
Invite customer
  → Customer claims relationship
  → Customer completes/publishes portfolio
  → Broker reviews readiness
  → System suggests potential matches using mutual mandatory filters
  → Broker uses judgement and sends Introduction
  → Customers review and respond
  → Broker records/follows up through app, phone, WhatsApp, or in person
  → Mutual interest and representation align
  → Customers explicitly approve contact bundles
  → Relationship progresses or closes
  → Broker manages renewal when due
```

Matching suggestions are deterministic and explainable. They apply mutual mandatory preferences such as age, height, location, education/profession, lifestyle, and permitted horoscope rules. They do not produce a desirability or compatibility score in MVP.

## 8. Dashboard action model

Every widget links to a filtered work queue and offers a clear next action:

- New customers — review or invite to complete.
- Profiles awaiting approval/review — inspect readiness and request corrections.
- Introductions awaiting action — follow up, record response, retry, or close.
- Customer responses — review/confirm the appropriate workflow action.
- Tasks due today — complete, reschedule, or open related customer/route.
- Pending renewals — contact customer and record outcome.

Do not add vanity charts to the primary dashboard during MVP.

## 9. Introduction timing and actions

- Standard portfolio view is used for BrokerDesk; the B2C short-mode concept does not apply.
- Each broker route is active for 30 days from its own sent time.
- Recommended reminders: customer on day 7, broker task on day 15, final customer reminder on day 25.
- Expiry at day 30 is “No response,” never rejection.
- Explicit rejection begins a recommended 90-day cooling period.
- Customer controls “Never show this person again.”
- Closing a route is not deletion; an eligible customer or broker may request retry.
- One positive response never releases contact information.
- Contact/family details require mutual confirmed interest, resolved representation, and bilateral bundle approval.

## 10. Multi-broker foundation

Customer A and Customer B may both have relationships with Broker A and Broker B. Either broker may send in either direction.

- Nakshatra internally recognizes one unordered customer pair.
- Each agency's act is a separate private route with its own direction, send time, status, reports, and lineage.
- Brokers never learn that another route exists.
- Customers see routes from all brokers on one counterpart-level Introduction.
- A customer shows interest through exactly one broker route; there is no “continue without a broker” action inside a broker-originated Introduction.
- An unselected broker receives a neutral outcome without competitor information.
- If customers select different brokers, the case enters `representation_alignment_pending`; no contacts are released and the exit policy is deferred for broker research.
- A direct B2C route combined with a broker route is structurally possible but its acceptance rules are deferred and fail closed.

Detailed states and authorization are defined in Phases 0C–0E.

## 11. Portfolio ownership and changes

- The customer maintains one live portfolio regardless of broker count.
- Draft edits remain private until published.
- Normal published updates appear in active authorized Introduction views automatically.
- Privacy reductions take effect immediately.
- Critical identity, marital status, verification, ownership, or availability changes may pause active sharing and require review.
- Brokers reference the live portfolio and never create their own version or request reshare after each normal update.
- Send-time portfolio version references are retained internally for audit/dispute purposes.

## 12. MVP privacy layers

### Shared Introduction layer

Only the approved standard information needed to evaluate an Introduction.

### Controlled private layer

Contact information, detailed family/contact data, financial data, private documents, private horoscope material, verification evidence, and other sensitive fields require purpose-specific access and customer approval.

Agency notes, staff assignments, internal tasks, verification risk signals, and other agencies' activity are never part of customer/profile sharing.

## 13. MVP boundary

Included:

- broker/business onboarding and verification;
- basic employee access and assignment;
- day-one customer import/invitation/claim;
- portfolio readiness review;
- bounded matching suggestions;
- Introduction routes, responses, follow-ups, tasks, and renewals;
- customer multi-broker Introduction dashboard;
- privacy, consent, audit, disclosure, notifications, and expiry.

Post-MVP:

- AI recommendations or compatibility insights;
- advanced automation/productivity analytics;
- complex multi-office/multi-broker organizations;
- cross-agency settlement;
- automatic resolution when customers select different brokers;
- combined B2C/broker-route acceptance;
- advanced professional verification programs.

## 14. Phase 0A acceptance result

Phase 0A established a coherent product foundation with Introduction at the center, one customer-owned portfolio, private many-to-many broker relationships, simple action-led navigation, conventional broker communication support, and explicit MVP/deferred boundaries.

