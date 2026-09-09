# BrokerDesk Phase 0F — Complete Operational Wireframes

Status: Approved clickable design baseline; no production UI implementation is authorized  
Prototype: [Open the standalone Phase 0F clickable prototype](../prototypes/brokerdesk-phase-0f.html)  
Depends on: Phase 0A product foundation, Phase 0C state contract, Phase 0D database/authorization architecture, and Phase 0E URL/API/security contract.

## 1. Purpose

Phase 0F translates the approved product, workflow, privacy, database, and API decisions into one end-to-end interface that brokers and customers can understand without technical terminology.

The prototype covers business setup, bringing 100 customers into the system, employee access, business verification, daily broker work, customer review, matching suggestions, Introduction operations, tasks/renewals, and the customer's combined multi-broker experience.

It is a behavioral wireframe. Names, counts, dates, and organizations are representative examples rather than production data.

## 2. Navigation model

BrokerDesk retains five primary items:

- Dashboard
- Customers
- Introductions
- Tasks
- Settings

Customer retains:

- Home
- My Portfolio
- Introductions
- My Brokers
- Access and Privacy

Imports, business verification, employees, roles, and assignments live inside Settings. Renewals appear in Tasks and relevant customer records. This keeps the primary navigation stable as the system grows.

The prototype's “Choose a workflow” control is a design-review navigator. It is not part of the production product shell.

## 3. Prototype workflow catalogue

### BrokerDesk setup

1. **Register the business** — four simple stages: business, representative, practice, and review.
2. **Bring in 100 customers** — private upload, validation, correctable rows, and controlled invitation batch.
3. **Give employees access** — role plus customer scope; clear active/waiting state.
4. **Verify the business** — representative identity, business registration, and contact checks with scoped status labels.

### Daily broker work

5. **Today's dashboard** — action cards for new customers, profile reviews, Introduction actions, responses, tasks, and renewals.
6. **Review customers** — bounded assigned-customer list with profile readiness and one next action.
7. **Customer record** — customer-owned portfolio readiness, preferences, agency relationship, and potential-match action.
8. **Find potential matches** — mutual mandatory-fit explanations with broker decision retained.
9. **Send an Introduction** — customer confirmation, preference fit, sharing controls, and a 30-day confirmation step.
10. **Introduction queue** — own agency's routes only with simple status and next action.
11. **Follow up on an Introduction** — own route timeline and conventional response recording.
12. **Tasks and renewals** — complete operational work without changing customer decisions implicitly.

### Customer experience

13. **Customer home** — Introduction actions, portfolio readiness, and broker relationships.
14. **Introductions from all brokers** — one counterpart card with every customer-visible broker route.
15. **Choose a broker and respond** — select exactly one broker while showing interest, or reject/block at the person level.
16. **Approve contact sharing** — explicit named contact bundles after mutual interest.

## 4. Broker onboarding wireframe contract

### Stage 1 — Business

Ask only for the information needed to create a pending workspace:

- legal/trading business name;
- business type;
- registration number where applicable;
- primary operating city/jurisdiction.

Do not show a “verified” badge or activate sensitive capabilities at this stage.

### Stage 2 — Representative

Collect representative name, position, work contact, and authority context. Reuse the signed-in identity rather than asking the person to create another account.

### Stage 3 — Practice

Collect office/service locations and operating history, followed by an explicit authority/terms declaration. Additional commercial details can remain optional until required.

### Stage 4 — Review

Use a plain summary and explain that the workspace remains private while identity and business checks are completed. Primary action: “Continue to verification.”

All steps support Save and continue. Validation is inline and does not erase completed work.

## 5. Day-one 100-customer import

The UI intentionally avoids language such as “merge into master database.”

1. Broker downloads the approved template or chooses an existing spreadsheet.
2. UI explains that the file remains private during checking.
3. Validation shows ready rows and correctable rows without exposing whether a person belongs to another agency.
4. “Possible duplicate” applies only within the importing business unless the authenticated customer later claims an existing Nakshatra account.
5. Broker fixes invalid rows or invites the valid set.
6. Invitation status becomes visible in the customer queue.
7. No unclaimed customer appears in matching suggestions or can be introduced.

Example result in the prototype: 92 ready, six missing contact details, and two possible duplicates inside the agency data.

## 6. Employee access

The employee screen uses two understandable controls:

- **Role** — a familiar preset such as Owner, Admin, Broker, or View only.
- **Customer access** — all customers, assigned customers, team, or explicit scope.

The database still authorizes capability × assignment × mandate × live session as defined in Phase 0D. The UI preset is a safe way to configure that policy.

Security-critical rules:

- new employees start with no customer access until invitation acceptance and assignment;
- owners/admins require step-up authentication for privilege changes;
- suspension applies immediately;
- the save result explains when the change takes effect;
- no employee can assign capabilities they do not control.

## 7. Verification UI

Each verification row states the exact check:

- Representative identity
- Business registration
- Business contact

Statuses use: Required, Under review, Verified, Needs attention, or Expired. Avoid the unqualified statement “trusted business.”

Document upload copy explains that documents are private from customers and brokers. Production upload follows Phase 0E quarantine, scan, file-signature, signed-access, and audit requirements.

## 8. Dashboard and queues

The first screen answers “What should I work on now?”

Every dashboard card contains:

- an action-oriented title;
- a small count;
- one sentence explaining the queue;
- one link into the filtered work.

The primary dashboard contains no vanity analytics. A “Today's priority” section may rank urgent work using deterministic due dates, customer responses, expiry, and assignment. It must never use hidden competing-broker activity.

Queue principles:

- show only the member's authorized scope;
- use cursor pagination and bounded search;
- preserve filters when opening and returning from a record;
- mobile views become action cards when a table no longer reads clearly;
- empty queues explain what will make an item appear.

## 9. Customer record and profile readiness

The broker sees the agency relationship and the permitted current published portfolio projection. The profile header distinguishes:

- Profile ready
- Identity verified
- Consent to introduce active
- Renewal timing

The readiness checklist is actionable. Missing customer-owned details lead to “Request update”; brokers do not silently edit or publish the portfolio.

The record never shows another agency, competing Introduction route, global customer activity, or data outside the active mandate.

## 10. Potential-match suggestions

The screen begins with the customer whose preferences are being applied. Results remain within the agency's active consented customer relationships.

Each suggestion explains relevant mandatory fit, for example:

- mutual age range;
- accepted location/relocation;
- lifestyle preference;
- permitted horoscope review;
- whether this agency already sent an Introduction.

There is no desirability percentage or compatibility score. The broker reviews the permitted portfolio and chooses whether to send.

## 11. Send-Introduction workflow

Four steps:

1. **Customers** — confirm both consented, ready agency relationships.
2. **Preference fit** — show mutual mandatory checks and any allowed human-review warning.
3. **Sharing** — standard Introduction view, notification channel, and agency-private note.
4. **Confirm** — recipients, 30-day response period, reminder pattern, and privacy boundary.

The send button uses one idempotent command. Success wording remains the same whether the internal pair case is new or already contains another agency's route.

The broker never sees “duplicate Introduction,” “another broker has shared,” a cross-agency count, or changed timing/copy that reveals hidden correlation.

## 12. Broker Introduction detail

The page shows:

- the agency's two customer relationships;
- its route state and days remaining;
- only its events, employee activity, reports, and tasks;
- Record response, Ask to try again, and Close actions when eligible.

“Record response” supports Phone call, WhatsApp, and In person. A response report visibly states that the customer can confirm or correct it. Recording a response does not silently change another route or release contacts.

“Close” explains that closure is neutral, not rejection and not deletion.

## 13. Tasks and renewals

Tasks retain a clear related object and due date. Completing a follow-up task does not imply that a customer responded.

Renewal work is a task/relationship action rather than an Introduction decision. The broker can record contact and renewal outcome while the customer portfolio and historical Introduction events remain customer-owned and auditable.

## 14. Customer combined Introduction experience

The customer sees one card per counterpart and all routes through which that person was introduced.

The detail page includes:

- counterpart's current permitted published portfolio;
- broker route names and customer-visible send/expiry details;
- customer-visible provenance for broker-recorded responses;
- one-broker selection inside the Interest action;
- person-level Not interested and Never show again actions;
- a privacy explanation before any contact approval.

The customer can choose Shubh Milan or Trusted Hearts in the sample. The choice is private. Neither broker learns that the other route exists or receives a competitor-selection reason.

There is no “Continue without a broker” action inside this broker-originated Introduction.

## 15. Contact sharing

After mutual confirmed interest and resolved representation, each customer approves named items independently:

- personal phone;
- personal email;
- parent/guardian contact;
- family address or other later-approved items.

Unchecked details remain private. Approval is Introduction-specific, viewer-specific, purpose-specific, versioned, revocable, and audited. One person's approval does not approve the other person's bundle.

## 16. Required states for implementation

Every production page/component requires:

- initial loading or server-rendered skeleton without leaking row counts;
- populated state;
- empty state with a next action;
- safe validation errors;
- stale state and refresh action;
- temporary dependency failure;
- unauthorized/nonexistent generic state;
- offline/retry behavior for safe idempotent commands;
- success state showing the new human workflow status;
- expired/closed/paused/blocked states where applicable;
- mobile, tablet, desktop, keyboard, zoom, and screen-reader behavior.

## 17. Accessibility and responsive baseline

- Target WCAG 2.2 AA.
- Semantic landmarks, headings, labels, tables, dialogs, and live announcements.
- Full keyboard access with visible focus and native control semantics.
- Status is never communicated by color alone.
- Buttons remain understandable without icons.
- Editable fields remain at least 16 CSS pixels on narrow touch layouts.
- Touch targets are approximately 44 × 44 CSS pixels where practical.
- No required action depends on hover.
- Tables reflow or become cards rather than forcing users to interpret clipped columns.
- Broker navigation becomes a horizontally scrollable, labeled row on narrow screens.
- The prototype was checked at desktop, tablet, and narrow layouts and has no runtime console errors.

## 18. Design alternatives available in review

The in-conversation prototype exposes two reversible presentation choices:

- Comfortable or compact information density.
- Nakshatra teal or warm plum accent direction.

These controls help review presentation only. They do not alter the approved workflow, information architecture, privacy, permissions, or data model. The existing B2C theme remains the implementation baseline.

## 19. Items deliberately deferred

- Resolution interface when the two customers choose different brokers.
- Combined decision UI when direct B2C and broker routes coexist.
- Cross-agency settlement or communication.
- Advanced analytics, automation builder, and AI recommendations.
- Complex regional office/team hierarchy.
- Final jurisdiction-specific business-verification document lists.

These states remain safe and cannot release contacts.

## 20. Phase 0F acceptance criteria

Phase 0F is ready for approval when:

- a broker can understand setup, import, daily work, Introduction, task, and renewal flows without CRM terminology;
- a customer can understand multi-broker routes, choose one broker, respond, and control contact sharing;
- no broker wireframe reveals another broker through content, counts, status, timelines, or actions;
- the 30-day route, neutral expiry, response provenance, retry, close, rejection cooling, and permanent block rules align with Phase 0C;
- all page concepts resolve to the Phase 0D entities and Phase 0E URLs/APIs;
- core desktop and narrow layouts are usable and keyboard-oriented controls are present;
- required production states and accessibility requirements are part of implementation acceptance;
- deferred scenarios remain visibly understandable to customers and fail closed in the underlying workflow.
