---
identifier: "SEC-BP-001"
name: "Passkeys and Phishing-Resistant Authentication"
version: "1.0.0"
status: "RECOMMENDED"

domain: "SECURITY"
documentType: "best-practice"
category: "identity"
appliesTo: ["web", "mobile", "api"]

lastUpdated: "2026-05-05"
owner: "Security Architecture Board"

standardsCompliance:
  iso: []
  rfc: ["RFC-9562"]
  w3c: ["WebAuthn-Level-3", "CTAP-2.2"]
  other: ["FIDO2", "NIST-SP-800-63B-4-draft", "OWASP-ASVS-5.0-V2"]

taxonomy:
  capability: "identity-access-management"
  subCapability: "authentication"
  layer: "security"

enforcement:
  method: "advisory"
  reviewChecklist:
    - "Passkey/WebAuthn registration and authentication endpoints implemented"
    - "Passkey credential binding offered for existing account holders (not new accounts only)"
    - "Fallback authentication method meets SEC-STD-001 R-1 MFA requirements"
    - "Authenticator attestation verified for high-assurance use cases"

dependsOn: ["SEC-GOV-000", "SEC-STD-001"]
supersedes: ""
---

# Passkeys and Phishing-Resistant Authentication

## Purpose

This best practice document provides implementation guidance for passkeys (FIDO2/WebAuthn-based authentication) as the preferred phishing-resistant authentication method referenced in SEC-STD-001 R-1. Passkeys eliminate passwords and phishable OTP codes by binding authentication to a cryptographic key pair that is scoped to the relying party origin — making credential phishing technically infeasible by design.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## Background

**Why passkeys over TOTP MFA?** TOTP (time-based one-time passwords via authenticator apps) is a significant improvement over passwords alone but remains phishable: a real-time phishing proxy can intercept the TOTP code and replay it within the 30-second window. Passkeys use a public-key cryptographic challenge-response bound to the exact origin (domain) of the relying party — a phishing site at `evil-bank.com` cannot receive a valid response for `bank.com` because the key is domain-bound.

**What is a passkey?** A passkey is a WebAuthn credential stored on a platform authenticator (device biometrics: Face ID, Touch ID, Windows Hello, Android fingerprint) or a hardware security key (YubiKey, etc.). The private key never leaves the authenticator; authentication is a signed challenge. Platform passkeys (stored in iCloud Keychain, Google Password Manager, etc.) are synced across a user's devices, making them practical for general consumer use.

## Rules

### R-1: Offer Passkeys as the Primary Authentication Method

Applications **SHOULD** implement passkey registration and authentication using the WebAuthn API (W3C Web Authentication Level 3) as the primary authentication pathway for web and mobile applications:

- Server-side: implement a relying party (RP) using a WebAuthn library (e.g., `@simplewebauthn/server`, `py_webauthn`, `webauthn4j`, `go-webauthn`)
- Client-side: use the `navigator.credentials.create()` and `navigator.credentials.get()` APIs; use the `PublicKeyCredential.isConditionalMediationAvailable()` check to enable autofill-style passkey discovery on login forms
- The WebAuthn RP ID **MUST** be set to the full registerable domain (e.g., `example.com`, not `app.example.com`) unless passkeys are intentionally scoped to a subdomain; RP ID determines the scope of credential binding
- Set `userVerification: "required"` for high-assurance use cases (access to Restricted-tier data, financial operations); `"preferred"` is acceptable for standard access where the fallback to PIN is acceptable

### G-2: Credential Binding for Existing Accounts

Passkey adoption **MUST** support binding to existing accounts, not only at new account registration:

- Present passkey registration to authenticated users in their account settings with a clear benefit explanation ("Sign in faster and more securely without a password")
- Trigger passkey registration prompts after successful password + MFA authentication for users who have not yet registered a passkey
- Allow users to register multiple passkeys (different devices, hardware security key as backup) and label them by device name
- Implement passkey credential management: list registered passkeys with last-used date; allow removal of individual credentials; require re-authentication before removing a credential
- When a user removes their last passkey, automatically ensure another second factor (TOTP, hardware key) is configured before completing removal

### G-3: Authenticator Attestation

For high-assurance use cases (privileged access, admin accounts, services processing Restricted-tier data), verify authenticator attestation:

- Request attestation during registration by setting `attestation: "direct"` in `PublicKeyCredentialCreationOptions`
- Validate the attestation statement against the FIDO Metadata Service (MDS3) to verify the authenticator's model and certification level
- For government or regulated financial contexts: require FIDO2 Level 1 certified authenticators at minimum; define which authenticator Authenticator Attestation GUIDs (AAGUIDs) are acceptable
- For consumer-facing applications: `attestation: "none"` is acceptable — passkeys remain phishing-resistant regardless of attestation; attestation adds assurance about the authenticator hardware, not about phishing resistance

### G-4: Passkey as Step-Up Authentication

Passkeys **SHOULD** be used as the step-up authentication mechanism when elevated privilege is required:

- Implement step-up re-authentication using WebAuthn `allowCredentials` filtered to the user's registered passkeys
- Step-up **SHOULD** be triggered before: accessing Restricted-tier data, changing account credentials, approving high-value transactions, accessing admin functionality
- Set a short timeout on step-up sessions (15–30 minutes); a step-up authentication **MUST NOT** persist for the lifetime of the full session

### G-5: Fallback and Recovery

Every passkey implementation **MUST** provide a secure fallback and account recovery path:

- Primary fallback: TOTP authenticator app (MUST meet SEC-STD-001 R-1 MFA requirements)
- Secondary fallback: hardware security key (FIDO2/CTAP2) — recommended for privileged users
- Account recovery: provide a recovery code (high-entropy, one-time) at registration time; the recovery code **MUST** be generated with at least 128 bits of entropy and stored per SEC-STD-002
- Recovery code storage: advise users to store recovery codes in a password manager or print and store offline; **MUST NOT** be stored in plaintext server-side; store as a hashed value (bcrypt, Argon2)
- Recovery flow: after successful recovery code use, immediately require the user to register a new passkey or add a new MFA method; the recovery code **MUST** be invalidated after use and a new one offered

### G-6: Cross-Device and Cross-Platform Considerations

- Test passkey flows on all target platforms and browsers before launch; behaviour varies between Safari (iCloud Keychain), Chrome (Google Password Manager), Firefox, and hardware authenticators
- Implement the `navigator.credentials.get()` conditional mediation (`mediation: "conditional"`) to surface passkey suggestions in the browser's autofill UI without requiring a separate UI element
- For mobile apps using Android or iOS WebViews: test passkey support explicitly; some WebView configurations do not expose the full WebAuthn API; use native FIDO APIs (`ASAuthorizationController` on iOS, FIDO2 API on Android) as an alternative
- Progressive enhancement: if `PublicKeyCredential` is not available (older browsers), fall back gracefully to password + TOTP without breaking the authentication flow

## Examples

### WebAuthn registration (server-side, pseudocode)

```
// Generate registration options
options = webauthn.generateRegistrationOptions({
    rpName: "Example Corp",
    rpID: "example.com",
    userID: user.id,
    userName: user.email,
    attestationType: "none",           // "direct" for high-assurance
    authenticatorSelection: {
        userVerification: "required",  // biometric or PIN required
        residentKey: "required"        // passkey (discoverable credential)
    }
})
session.set("current_registration_challenge", options.challenge)

// Verify registration response
verified = webauthn.verifyRegistrationResponse({
    response: client_response,
    expectedChallenge: session.get("current_registration_challenge"),
    expectedOrigin: "https://example.com",
    expectedRPID: "example.com"
})
if verified.verified:
    store_credential(user.id, verified.registrationInfo)
```

### Conditional mediation (autofill UI)

```javascript
// Show passkey in browser autofill without a button
if (await PublicKeyCredential.isConditionalMediationAvailable()) {
  const assertion = await navigator.credentials.get({
    mediation: 'conditional',
    publicKey: authenticationOptions
  })
  // User selected their passkey from the autofill dropdown
  await verifyAssertion(assertion)
}
```

## References

- [W3C Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/)
- [FIDO2 Project](https://fidoalliance.org/fido2/)
- [FIDO Metadata Service (MDS3)](https://fidoalliance.org/metadata/)
- [NIST SP 800-63B-4 Draft — Phishing-Resistant AAL3](https://pages.nist.gov/800-63-4/)
- [passkeys.dev — Developer documentation](https://passkeys.dev/)
- [SimpleWebAuthn — Reference implementation library](https://simplewebauthn.dev/)
- SEC-STD-001 R-1 — IAM (MFA requirement that this document implements)
- SEC-STD-002 — Secrets Management (recovery code storage)
- SEC-GDL-001 — Data Classification (step-up trigger for Restricted-tier data)

## Rationale

**Why passkeys over hardware OTP tokens?** Hardware TOTP tokens (RSA SecurID, etc.) are phishable via real-time proxies. Passkeys are not. The FIDO2 cryptographic binding to the RP origin means the credential simply cannot be replayed on a different domain, regardless of how convincing the phishing page is.

**Why credential binding for existing accounts?** New-account-only passkey support means most users never see passkeys — the existing user base continues with passwords. The leverage point is prompting existing users to add a passkey after their next successful password-based login. This converts the established user base over time without forcing a migration event.

**Why recovery codes over SMS backup?** SMS-based account recovery is phishable via SIM-swap attacks. A high-entropy recovery code stored by the user (in a password manager or on paper) provides a phishing-resistant backup path that does not depend on telecom infrastructure. SMS **MUST NOT** be offered as the sole recovery mechanism for accounts with access to Confidential or Restricted-tier data.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-05 | Initial definition |
