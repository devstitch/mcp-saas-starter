# Security Policy

## Supported versions

Security fixes apply to the current `main` branch until a versioned release is tagged.

## Reporting a vulnerability

Report privately. Do not open a public GitHub issue, and do not include exploit details in a pull request.

Email **security@devstitch.example** with:

- A short description of the issue
- The affected path (MCP tool, web route, or database policy)
- Steps to reproduce on the demo seed data
- The impact (for example cross-tenant read, unauthorized delete, or secret exposure)

Replace `security@devstitch.example` with a monitored address before the public v1 tag.

We will acknowledge the report within 3 business days and aim to confirm or reject it within 10 business days. Please give us a chance to ship a fix before any public write-up.

## Out of scope

The demo password `Password123!` and the `*.example.com` users are intentional local seed data, not production credentials.
