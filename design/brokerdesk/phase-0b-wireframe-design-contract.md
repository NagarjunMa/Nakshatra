# BrokerDesk Phase 0B — Wireframe and UX Design Contract

Status: Approved core wireframes; refinement continues as later contracts are finalized  
Prototype: [Open the standalone clickable Phase 0B prototype](../prototypes/brokerdesk-phase-0b.html)  
Purpose: Preserve the UX reasoning, screen structure, language rules, and privacy behavior represented by the clickable prototype.

## 1. Design objective

BrokerDesk must feel calm, professional, trustworthy, and easy for a broker who currently relies on WhatsApp, phone calls, and spreadsheets. The interface organizes work without requiring the broker to learn database, CRM, pipeline, route, case, or state-machine terminology.

The customer experience continues the existing Nakshatra B2C visual identity. BrokerDesk reuses its typography, color language, spacing, cards, form controls, portfolio templates, privacy indicators, and trust patterns while using denser action queues where broker productivity requires it.

## 2. UX principles

1. Lead with the next action, not a generic record summary.
2. Use short, familiar language and one primary action per section.
3. Keep the five-item BrokerDesk navigation stable.
4. Show progressive detail; do not place every field on the first screen.
5. Preserve context when moving from dashboard → queue → customer/Introduction → action.
6. Make privacy state visible before sharing.
7. Keep conventional contact methods first-class: “Called,” “WhatsApp,” “Met in person.”
8. Confirm high-impact actions in plain language with the affected people and information.
9. Use empty states to explain the next useful action.
10. Never reveal competing broker activity through text, badges, counts, disabled buttons, or timelines.

## 3. BrokerDesk shell

Primary navigation:

- Dashboard
- Customers
- Introductions
- Tasks
- Settings

Global elements:

- current business/workspace name;
- simple workspace switcher when applicable;
- notifications/action count;
- help and account controls;
- consistent search limited to authorized workspace records.

Avoid “Leads,” “Deals,” “Opportunities,” “Pipeline,” and other sales-CRM language.

## 4. Core wireframes

### Broker dashboard

Answers “What should I work on right now?” through action cards:

- New profiles
- Profiles awaiting review
- Introductions awaiting action
- Customer responses
- Tasks due today
- Pending renewals

Each card shows a small count, short explanation, and one action that opens the filtered queue. The initial viewport prioritizes today's work over analytics.

### Customer record

Shows only the agency relationship and authorized current portfolio projection:

- customer identity/readiness summary;
- portfolio completion and verification;
- mandatory preferences;
- recent agency interactions;
- active/previous agency Introduction routes;
- tasks and renewal;
- primary actions: request update, find potential matches, send Introduction.

No broker sees the customer's other brokers or their work.

### Potential matches

Displays candidates from the same agency's consented customer base who satisfy mutual mandatory rules. Each card explains important fit/filter facts and previous route status. Broker judgement remains explicit.

Primary action: “Send introduction.”  
Secondary actions: view permitted profile, add follow-up task, dismiss suggestion for an agency-private reason.

### Send Introduction

A short review workflow:

1. Confirm the two customers.
2. Review portfolio readiness and privacy-safe shared sections.
3. Review mandatory preference fit and prior route status for this agency only.
4. Confirm 30-day response period and notification recipients.
5. Send.

The broker receives normal success wording regardless of whether another agency has introduced the same pair.

### Broker Introduction detail

Contains:

- two-customer summary;
- own route state and days remaining;
- own timeline only;
- response/follow-up actions;
- assigned staff and tasks;
- simple actions: record response, request retry, close.

It never displays a duplicate warning, other broker, route count, pair case, cross-agency response, or customer selection of a competitor.

### Customer Introduction inbox

Groups all broker-originated routes by counterpart, so the customer sees one person card even when several brokers shared the pair.

The card emphasizes:

- counterpart's permitted current portfolio summary;
- response due information;
- whether customer action is required;
- number/list of customer-visible broker routes without implying that brokers can see one another.

### Customer Introduction detail

Shows:

- permitted current counterpart portfolio;
- customer-safe sharing timeline;
- each broker route available to that customer;
- route provenance and any broker-recorded response awaiting confirmation;
- “Interested through this broker,” “Not interested,” “Ask to try again,” and “Never show again” actions;
- privacy explanation before later contact approval.

There is no “Continue without a broker” action for a broker-originated Introduction. The customer selects exactly one route when showing interest.

## 5. Language contract

Broker-facing:

| Internal concept | UI wording |
|---|---|
| Agency-customer relationship | Customer |
| Introduction route | Introduction |
| Response report | Record response |
| Person-level pending | Waiting for customer |
| Route expiry | No response |
| Retry command | Ask to try again |
| Portfolio mandate | Permission to help with profile |
| Access grant | Shared information access |

Customer-facing:

- “Choose the broker you want to continue with.”
- “Your choice is private. Other brokers are not told who you selected.”
- “Your contact details are still private.”
- “Both people must be interested before contact sharing can be considered.”
- “No response is not the same as saying no.”
- “This response was recorded by [broker] after speaking with you. Confirm or correct it.”

Avoid “winner,” “duplicate,” “conflict,” “competing broker,” “lead,” “conversion,” and unexplained workflow codes.

## 6. State and feedback rules

- Disable a button only with a clear reason and next available action.
- After a command, show the updated human state, not a technical success toast alone.
- Preserve draft input when a safe validation error occurs.
- On stale state, explain that the Introduction changed and refresh the relevant card.
- Use neutral broker outcomes when person-level decisions affect the route.
- Expired routes display “No response” and the available retry/close action.
- Rejection and permanent block require deliberate confirmation; permanent block uses stronger wording and fresh authentication.
- Contact sharing identifies the exact bundle being approved.

## 7. Accessibility and responsive requirements

- Meet WCAG 2.2 AA for implemented screens.
- Full keyboard operation, visible focus, semantic headings/landmarks, and meaningful accessible names.
- Do not communicate status only by color.
- Minimum practical touch target and readable text size for mobile brokers.
- Tables become ordered action cards on narrow screens rather than horizontal overflow where possible.
- Support browser zoom and content expansion without lost actions.
- Use plain error summaries linked to specific fields.
- Avoid auto-advancing multi-step forms before a user confirms.
- Dates use understandable local display with an unambiguous stored UTC value.

## 8. Security and privacy in the UI

- Never render data and hide it only with CSS or role-based components; unauthorized fields must be absent from the response.
- Do not prefetch protected links across workspace/customer boundaries.
- Do not place private data in page titles, analytics, telemetry, query strings, local storage, or notification previews.
- Clear cached client state when workspace/account changes or authorization is revoked.
- Private media uses authorized short-lived access and safe loading states.
- Confirm the active workspace and affected customer for sensitive broker actions.
- Do not reveal other broker activity in skeleton sizes, counters, pagination, disabled controls, or error copy.

## 9. Prototype scope and limitations

The Phase 0B standalone prototype demonstrates the primary BrokerDesk and customer Introduction paths. It is a review artifact rather than production UI and does not yet fully cover:

- business onboarding and verification;
- 100-customer import/claim;
- all employee RBAC and assignment screens;
- complete task/renewal queues;
- every empty/error/loading/mobile/accessibility state;
- split-representation safe state;
- exact API and security behavior.

Those details are governed by Phases 0C–0F. Phase 0F will expand the complete operational wireframes after the database/API contracts are approved.

## 10. Phase 0B acceptance result

The core wireframes establish an action-led five-item broker workspace, a customer-owned multi-broker Introduction inbox, simple conventional response actions, one-broker selection per customer, and strict separation between customer-visible combined history and broker-visible agency history.

