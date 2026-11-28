# Shining Vacation Homes

Next.js App Router and React website for Dubai accommodation and property-management enquiries. The team follows up with actual available options; the website has no live inventory, checkout or instant reservations.

## Local setup

Requires Node.js 20.9+ (Cloudflare builds use Node 24). Copy `.env.example` to `.env.local`, then configure the private email settings.

```sh
npm ci
npm run build:next
npm run preview
```

Preview: http://127.0.0.1:4173/. Use `npm run dev` for hot reload. Run only one server on that port. For a Cloudflare worker preview, use `npm run cf:preview`.

## Cloudflare Workers settings

Connect the GitHub repo in Cloudflare Workers/Pages and set:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` (repo root) |

`npm run build` runs the OpenNext Cloudflare worker bundle (Next build lives in `npm run build:next`). Use the same production environment variables as Vercel below, including `ENQUIRY_DATABASE_URL` and `ENQUIRY_DATA_KEY`. Cloudflare has no persistent local disk, so PostgreSQL is required for enquiry storage. Optional local check: `npm run cf:preview`.

## Vercel production settings

Set these values directly in the project's Production environment settings:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Approved public HTTPS origin |
| `ENQUIRY_ORIGIN` | The same origin, without a trailing slash |
| `ENQUIRY_PROVIDER` | `brevo` (HTTP API; works on Cloudflare Workers). Also `gmail` / `resend` |
| `BREVO_API_KEY` | Brevo API key (`xkeysib-…`). SMTP keys (`xsmtpsib-…`) will not work |
| `ENQUIRY_FROM` | Verified Brevo sender (e.g. `info@shiningvacationhomes.com`) |
| `ENQUIRY_TO` | Primary inbox for enquiries |
| `ENQUIRY_BCC` | Optional BCC recipients |
| `ENQUIRY_DATABASE_URL` | Managed PostgreSQL connection URL |
| `ENQUIRY_DATA_KEY` | Stable private 64-character hexadecimal encryption key |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (public) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key (server-only) |

Vercel uses `npm run check:release && npm run build:next`. Keep its output directory at the Next.js default. Missing production settings intentionally block release.

Always use `npm run build:next` for a plain Next.js output: it validates the prerendered files and generates the script-hash security policy. Use `npm run build` when you need the Cloudflare worker bundle. For a conventional Node host, run `npm start` behind HTTPS with persistent storage configured.

## Operations

- `npm run check:email`: check Gmail authentication without sending a message.
- `npm run check:live -- https://your-domain`: read-only public route, security-header and metadata checks.
- `npm run enquiries -- list`: inspect saved references and delivery states; expired records are pruned.
- `npm run enquiries -- show REFERENCE`: display an enquiry locally; contains private information.
- `npm run enquiries -- delete REFERENCE`: remove its website record; mailbox copies are separate.
- `npm run enquiries -- prune`: remove expired website records.

Validated enquiries are encrypted before delivery. A saved reference or provider acceptance does not establish inbox receipt or a reservation. Review failed delivery states, maintain backups of the database and encryption key, and confirm a controlled form-to-inbox test before launch. Website records expire after 30 days; email retention is separate.

Keep `.env.local`, credentials and private `.data/` records out of Git. Full motion remains enabled. Photographs use existing local responsive WebP files; no request-time conversion is needed.

## Media

Collection photographs originate from https://shiningvacationhomes.com/wp-content/uploads/2025/02/ . The original studio, 1BR, 2BR, 3BR, 4BR and villa JPEGs are retained alongside responsive WebP versions. Photographs illustrate accommodation styles and do not establish live availability. The business must confirm media rights and final privacy/booking arrangements. Font licence files remain alongside their assets.
