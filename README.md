# svc-accounting-ui

A Next.js (App Router) frontend for a personal accounting app. It covers sign-up and login, account management with CSV import, recording and browsing transactions, and income and expense statistics with a forecast. It holds no business logic of its own beyond form validation and presentation; the `svc-accounting` Rails API does everything else.

## Quick start

You'll need Node.js (matching `next@16`'s support range), npm, and a running `svc-accounting` backend to talk to.

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

`NEXT_PUBLIC_API_URL` is the backend's origin. Every request goes to `${NEXT_PUBLIC_API_URL}/api/v1/...` (`lib/api-client.ts`). Leave it unset and requests fall back to a relative `/api/v1/...` path, which only works when this app and the API share an origin.

Start the dev server:

```bash
npm run dev
```

The app now runs on [http://localhost:3000](http://localhost:3000). If the backend also defaults to port 3000, run one of the two on a different port and update `NEXT_PUBLIC_API_URL` to match.

## Testing and linting

```bash
npm test            # Jest and React Testing Library, unit and component tests
npm run test:e2e    # Playwright; no specs exist under e2e/ yet, so this exits 0 via --pass-with-no-tests
npm run lint         # eslint
npm run build          # production build, and the fastest full type-check
```

## Architecture

```
app/
├── (auth)/          # /login, /signup - unauthenticated layout
└── (app)/           # /accounts, /accounts/[accountCode], /transactions, /statistics - behind AuthGuard
lib/
├── api-client.ts    # axios instance; throws ApiError ({ code, message, details }) on any non-2xx response
├── auth/            # AuthProvider (React Context over TanStack Query), AuthGuard, zod schemas
├── query-client.ts  # the shared TanStack Query client
├── intervals.ts     # Interval type plus URL (de)serialization, shared by every page with a date-range filter
├── money.ts         # formatMoney, the one place a currency code is uppercased for display
└── accounts/, transactions/, statistics/   # one schemas.ts (zod) and one queries.ts/use-*.ts (TanStack Query hooks) per feature
components/
├── ui/              # shadcn primitives: Button, Dialog, Form, Select, and the rest
├── data-table/      # the shared TanStack Table wrapper every list view configures
├── interval-nav/    # the shared interval selector and shift-arrows control
└── accounts/, auth/, statistics/, transactions/   # feature components, one file per component, colocated tests
```

### Data fetching

All server state goes through TanStack Query. No component calls `apiClient` or `fetch` directly from a `useEffect`. Each feature's hooks live in its own `lib/<feature>/` module: a `useXQuery` or `useX` for reads, and one `useMutation`-based hook per write action. Every mutation invalidates the query keys its own write actually affects, so a transaction write invalidates the transactions list, that page's stats query, and the accounts list, since a transaction changes an account's balance.

### Forms

Every form binds `react-hook-form` to a `zod` schema, defined alongside its feature's other schemas in `lib/<feature>/schemas.ts`. When a backend validation error maps onto one field, it surfaces there via `form.setError`. Anything else falls back to a toast (`sonner`).

### Money and currency

Every amount from the API arrives as a decimal string, formatted for display only through `formatMoney` (`lib/money.ts`). It's never coerced into a JS `number` for arithmetic, since floating-point math on money is exactly what the backend's `decimal` columns and `Currencies::Money` value object exist to avoid. Currency codes stay lowercase everywhere except the final `Intl.NumberFormat` call that renders one.

### Design system

The whole app follows a "hacker terminal" visual language: near-black backgrounds, one green accent at varying opacity, Courier Prime monospace, and uppercase tracked-out labels, with bordered cards that brighten on hover instead of using shadows. `app/globals.css` defines the tokens; component-level Tailwind classes should reuse them rather than introduce a new color, radius, or font.
