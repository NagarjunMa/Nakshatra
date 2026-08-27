# Didit India document support matrix

This is an evidence template, not a provider-support claim. Do not enable a
document type in Production because it appears in marketing material or a
generic global coverage list. Each exact document variant must pass in the
Nakshatra Sandbox workflow and be approved by the privacy owner.

| Document and variant | Phase 0 status | Required checks | Evidence to record | Production decision |
| --- | --- | --- | --- | --- |
| Indian passport (current machine-readable passport) | Not tested | ID verification, passive liveness, face match, IP analysis | Sandbox date, workflow version, result, error class | Pending evidence |
| Indian driving licence (physical card) | Not tested | ID verification, passive liveness, face match, IP analysis | Sandbox date, workflow version, result, error class | Pending evidence |
| Indian driving licence (state/legacy variant) | Not tested | ID verification, passive liveness, face match, IP analysis | Sandbox date, workflow version, result, error class | Pending evidence |
| Voter ID (exact accepted variant only) | Disabled pending test | ID verification, passive liveness, face match, IP analysis | Sandbox date, workflow version, result, error class | Enable only after evidence |
| Aadhaar | Explicitly disabled | Not applicable | Privacy review reference if reconsidered | Do not enable |
| PAN | Explicitly disabled | Not applicable | Privacy review reference if reconsidered | Do not enable |

## Test rules

- Use Didit Sandbox and approved test material only.
- Test each document separately; a successful passport test does not establish
  driving-licence or voter-ID support.
- Record only a non-sensitive outcome and error class in the evidence store.
  Never place images, document numbers, names, session URLs, screenshots, or
  raw provider output in this matrix or Linear.
- A declined, unavailable, or ambiguous variant remains disabled. Offer a
  documented non-discriminatory fallback rather than requesting a more
  sensitive document by default.

