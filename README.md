# NovaAssist
**NovaAssist** is a small Proof of Concept I worked on to explore something I’ve been thinking about for a while:

How do we use AI in regulated documentation workflows without losing control, traceability, or compliance?

In regulated industries, document edits aren’t just edits; they’re evidence.

Every redline needs justification.
Every change needs to be reviewable.
Every comment might be revisited months (or years) later.

Most AI writing tools focus on speed.

This PoC explores how AI can support reviewers while still respecting governance.

## What It Does

NovaAssist is built as a Microsoft Word Office Add-in that:

- Suggests policy-aware edits on selected text
- Programmatically enforces Track Changes
- Adds justification as Word comments
- Uses Azure AD (SSO) for secure authentication

Accesses reference documents via Microsoft Graph

The AI does not automatically rewrite documents.

It suggests.

Humans review.

That distinction matters.

## Architecture Thinking

I intentionally designed the system with separation of concerns:

1. UI Layer – Chat-style interface inside Word

2. Office Interaction Layer – Handles text selection, tracked edits, and comment insertion

3. AI Service Layer – Calls Azure OpenAI for structured suggestions

4. Microsoft 365 Integration – Uses Azure AD + Graph for secure access to documents

This structure helps keep the system:

- Testable
- Transparent
- Easier to validate
- Safer in regulated environments

No document storage outside Microsoft 365.
No silent edits.
No bypassing enterprise permissions.

## Design Principles

- Human-in-the-loop by default
- Track Changes is always enabled
- Justification captured alongside edits
- Policy-aware suggestions
- Enterprise security first

Speed is important.
But in regulated environments, speed without governance creates risk.

This PoC explores how we can have both.

## Current State

This is a Proof of Concept and not production-ready.

It demonstrates:

- AI-assisted redlining on selected text
- Comment-based justification
- Secure authentication flow
- Policy reference retrieval

Future iterations could include citation tracking, redline summary exports, and multi-policy support.
