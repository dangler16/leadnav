# LeadNav

LeadNav is a lead ordering, distribution, billing, and agent operations platform built with Next.js, Supabase, and Stripe.

## What is included

- Role-based accounts for super administrators, team administrators, and agents
- Teams, member permissions, and administrator assignments
- Vendor configuration and API-key management
- Inbound lead webhook with duplicate detection and validation
- Round-robin lead assignment based on vendor, state, lead type, availability, wallet balance, and daily budget
- Lead status management and agent reassignment
- Orders, order-agent assignments, archiving, and transfers
- Dial tracking, call outcomes, notes, private recordings, and lead-status updates
- Lead disputes and administrator review
- Wallet funding and Stripe Checkout
- Notifications, reporting, profile settings, dark mode, and PDF exports
- Supabase migrations with row-level security and storage setup
- GitHub Actions lint, production-build validation, and guarded Supabase deployment

## Technology

- Next.js 16 and React 19
- TypeScript and Tailwind CSS
- Supabase Auth, Postgres, Row Level Security, and Storage
- Stripe Checkout and webhooks
- shadcn/Base UI components
- jsPDF

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Set every value in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_TIME_ZONE=America/Denver
```

`SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are server-only secrets. Never prefix them with `NEXT_PUBLIC_` or expose them in browser code.

### 3. Create the Supabase database

Install and authenticate the Supabase CLI, link the project, and apply the migrations:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migrations in `supabase/migrations` create the application tables, indexes, profile provisioning, wallet functions, role-aware row-level-security policies, private call-recording storage, and supporting storage buckets.

For an existing LeadNav database, review the migration dry run before applying pending migrations.

### 4. Create the first administrator

Create or invite the first user in Supabase Authentication. The profile trigger initially assigns every new account the safe `user` role.

Promote that existing Auth user with the included utility:

```bash
SUPABASE_ADMIN_EMAIL=admin@example.com npm run supabase:bootstrap-admin
```

The command also requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

Alternatively, promote the user through the Supabase SQL editor:

```sql
update public.profiles
set role = 'super_admin'
where id = (
  select id
  from auth.users
  where email = 'YOUR_ADMIN_EMAIL'
);
```

After that, administrators can invite and manage users from the LeadNav Users page.

For a private internal deployment, disable public email signups in Supabase Auth and use administrator invitations.

### 5. Configure Supabase Auth URLs

Set the Supabase Site URL to the deployed application URL. Add these redirect URLs for development and production:

```text
http://localhost:3000/confirm
https://YOUR_DOMAIN/confirm
```

LeadNav supports both token-hash invitation links and Supabase PKCE confirmation links.

### 6. Configure Stripe

Create a Stripe webhook pointing to:

```text
https://YOUR_DOMAIN/api/stripe/webhook
```

Subscribe it to:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
```

Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

Wallet credits are idempotent and are only applied after Stripe reports the Checkout session as paid.

### 7. Run the application

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production validation

Run these checks before deployment:

```bash
npm run lint
npm run build
npm run supabase:verify
```

`supabase:verify` requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. It verifies the required tables, storage buckets, daily-spend RPC, private recording bucket, and at least one super administrator.

The application lint and build checks run through `.github/workflows/ci.yml` on pushes and pull requests targeting `main`.

## Guarded Supabase deployment

The repository includes `.github/workflows/deploy-supabase.yml`. It performs a dry run, applies pending migrations, optionally promotes the designated administrator, verifies the deployed resources, lints the linked database, and prints the final migration status.

Create a GitHub environment named `production` and add these repository or environment secrets:

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
SUPABASE_PROJECT_ID
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ADMIN_EMAIL
```

`SUPABASE_ADMIN_EMAIL` is optional when a super administrator already exists. The other five values are required.

To deploy:

1. Open the repository's **Actions** tab.
2. Select **Deploy Supabase Schema**.
3. Choose **Run workflow**.
4. Enter `DEPLOY` in the confirmation field.
5. Review the migration dry run and final verification output.

Use protection rules on the `production` environment when an approval should be required before applying migrations.

## Inbound lead webhook

Administrators generate vendor API keys from the Vendors page. Send the raw key in the `X-API-Key` header:

```bash
curl -X POST https://YOUR_DOMAIN/api/leads/inbound \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: lnk_REPLACE_WITH_VENDOR_KEY' \
  -d '{
    "firstname": "Jane",
    "lastname": "Doe",
    "phone": "8015550100",
    "email": "jane@example.com",
    "birthday": "1960-08-15",
    "state": "UT",
    "zip": "84101",
    "income": 52000,
    "household": 2,
    "utm_source": "affiliate-name",
    "utm_campaign": "summer-campaign"
  }'
```

The webhook:

1. Authenticates the vendor API key.
2. Validates and normalizes the lead.
3. Confirms vendor state and lead-type coverage.
4. Checks for duplicate name/contact combinations.
5. Finds an active order matching the vendor, state, lead type, configured day, remaining daily budget, and wallet balance.
6. Assigns the lead using round-robin distribution.
7. Charges the agent wallet and records the order-level transaction.
8. Creates an in-app notification for the assigned agent.

Successful creation returns HTTP `201` with the lead, agent, and order IDs. Duplicate submissions return the existing lead ID with `duplicate: true`. When no eligible order is available, the endpoint returns HTTP `503` without creating or charging a lead.

## Database overview

Primary tables:

- `profiles`
- `teams`
- `team_members`
- `team_admin_assignments`
- `vendors`
- `vendor_api_keys`
- `orders`
- `order_agents`
- `leads`
- `call_logs`
- `disputes`
- `notifications`
- `wallet_transactions`

The browser uses the Supabase anonymous key and is constrained by Row Level Security. Privileged mutations and external webhooks use the server-only service-role client.

Call recordings are stored in a private bucket. Playback goes through an authenticated API route that checks database access and issues a five-minute signed storage URL.

## Deployment

LeadNav can be deployed to Vercel or another Node.js platform that supports Next.js server routes.

For Vercel:

1. Import this repository.
2. Add every value from `.env.example` to the project environment variables.
3. Deploy the `main` branch.
4. Update `NEXT_PUBLIC_APP_URL`, Supabase Auth URLs, and the Stripe webhook URL to the production domain.
5. Confirm `https://YOUR_DOMAIN/api/health` returns HTTP `200` with `status: ok`.
6. Run a test vendor webhook and a Stripe test-mode wallet top-up before enabling production traffic.

## Security notes

- Keep the Supabase service-role and Stripe secret keys server-only.
- Rotate a vendor API key immediately if it is exposed.
- Use HTTPS in production.
- Restrict Supabase Auth signups for internal deployments.
- Test migrations and Stripe webhooks in staging before production changes.
- Call recordings use short-lived signed upload and playback URLs and are limited to supported audio formats and 25 MB.
