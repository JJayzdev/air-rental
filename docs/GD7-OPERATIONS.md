# GĐ7 operations and acceptance

## Local mock-payment acceptance

This flow uses the repo-local Supabase project (`air-rental`, API port 55321), a dedicated Next.js preview on port 3011, and synthetic bank details. It creates a temporary product, customer, booking, webhook events, and payments, then removes records belonging to that run. It never connects to a hosted project or a bank.

1. Start the existing local A.I.R Supabase stack using the project's normal local workflow. Do not run a database reset for this check.
2. In a PowerShell terminal, run `pwsh -File ./scripts/start-gd7-preview.ps1`. Use `-Build` if the preview needs a fresh production build. Use `-FreshCatalog` if fixtures were added after the catalog cache was built; the helper refuses to clear it while port 3011 is listening. Keep the terminal open.
3. In a second terminal, run `node scripts/check-gd7-rental-payment.mjs`.

The script validates the dedicated Docker project label and work directory before it writes fixtures. It also refuses any preview hostname other than loopback or any preview port other than 3011. Its webhook uses a fixed local-only key that is set by the preview helper; the key is not printed. The preview helper provides synthetic account details and service-role key to the Next.js process, disables error alerts and clears any inherited alert URL, then restores the invoking PowerShell environment when Next exits. It also disables LLM, phone OTP, and identity-document integrations for the run.

Expected checks:

- A three-day 700,000 ₫/day booking stores 2,100,000 ₫ subtotal, 210,000 ₫ discount, 30,000 ₫ delivery fee, 1,920,000 ₫ rental total, and a separate 500,000 ₫ deposit.
- A mock deposit transfer changes the owner's order to `deposit_paid`; replaying the same provider transaction is marked duplicate and leaves one ledger row.
- A mock 1,920,000 ₫ balance transfer changes the order to `paid`; the owner page shows 2,420,000 ₫ received including the deposit.
- A different verified account cannot read the order or its contact/payment details.

The test is destructive only to its own temporary fixtures. If it is interrupted before cleanup, use the printed `gd7-<id>` fixture marker to identify only that run's product, discount, order, payment, event, and user rows before removing them. Do not use a broad table cleanup.

## Logs and health

Webhook database failures emit one JSON event with a fixed event name, timestamp, bounded error name, and a five-character SQLSTATE when available. Raw database messages, transfer payloads, customer details, and authorization headers are not logged. The optional generic operator webhook transport is implemented and covered by mocked tests; no real destination is configured or delivery exercised. Enable it with `AIR_ENABLE_ERROR_ALERTS=true` and `OPS_ALERT_WEBHOOK_URL` set to an HTTPS endpoint. It is disabled by default, rejects embedded credentials, fragments, and redirects, has a 2.5-second timeout, and shares a 60-second cooldown across all errors in one process. The cooldown is process-local; multiple instances may each send once per interval. Delivery failures are reduced to a fixed local event and never alter the SePay 500 response. Configure a destination only after validating its ownership and retention; its URL may contain a secret and is never logged or included in alert payloads. Monitor process events and local Supabase services using their existing process output and `supabase status`. Real destination configuration and delivery remain a release operations gate.

## Incident response

- **Webhook returns 5xx or order stays unpaid:** preserve the provider transaction reference and time from the bank/provider record. Check the app process event and local Supabase health. Confirm whether `payment_webhook_events` already has that exact provider external ID before requesting a retry; the unique provider/reference pair makes replays safe. Never insert a payment row or change `payment_state` by hand. If the payment reached the bank but the app remains unavailable, reconcile with the provider statement and contact the customer through the normal support channel.
- **Payment amount or status differs from the receipt:** pause manual fulfillment for that order. Compare the order subtotal, discount, delivery fee, rental total, deposit, and succeeded payment ledger amounts with the bank statement. Check replay/duplicate event outcome. Refunds remain a separate staff action; do not issue an external refund based only on a browser screenshot.
- **Booking appears twice:** use the customer's account and idempotency attempt history to identify the order(s); check `request_hash`, overlapping reservations, and order creation time. Keep the valid order and release only a confirmed duplicate through the established cancellation workflow. Do not delete order rows or reservations directly during an incident.
- **Database or Supabase outage:** inspect `supabase status` and the app process logs, preserve the current stack state, and use the team's approved recovery procedure. Do not reset the database or restore into the active database as an incident shortcut. Escalate if restoration is needed; the local restore rehearsal is not a production disaster-recovery plan.
- **Suspected credential or customer-data exposure:** stop sharing logs/archives and restrict access to the affected process/storage. For a live deployment, disable the webhook/payment integration through its deployment configuration, rotate the webhook/service credentials at their source, and reconcile transfers received during the gap before re-enabling it. Keep incident artifacts access-controlled and follow the organization's privacy response process. The local preview uses synthetic values only.

## Local database snapshots

Run `pwsh -File ./scripts/backup-local-db.ps1` to create a timestamped custom-format PostgreSQL archive at `.local-backups/`. The script verifies the local Supabase project label and exact repository work directory, accepts only a generated-style filename, refuses overwrite or path traversal, and validates the archive listing. The database archive includes PostgreSQL data, including Auth records and Storage object metadata; file/blob bytes are stored outside PostgreSQL and are not included. Environment secrets are not part of the database dump. The archive can contain personal, order, payment, and authentication data, so treat it as private operational data. `.local-backups/` is ignored by Git.

Never restore into the active `postgres` database. To rehearse, first create a backup, then run `pwsh -File ./scripts/rehearse-local-restore.ps1 -BackupPath ./.local-backups/air-local-YYYYMMDD-HHMMSS.dump`. The script validates the same container label and working directory, copies the archive to a uniquely named database (`air_gd7_restore_<uuid>`) created from `template0`, restores there as the existing local `supabase_admin` superuser so ownership, ACLs, and default privileges are replayed, compares RLS policy and ACL counts plus order/payment/Auth-user/Storage-metadata row counts, checks authenticated order/payment read grants, and drops only the database whose generated ownership comment matches the current run. It does not print row data. It runs inside the same local PostgreSQL cluster, so it checks database-object recovery and built-in role grants; it does not rehearse cluster-role provisioning or restore Storage blob bytes. The local rehearsal completed successfully on 2026-11-02 against the private archive created for that run; this does not establish production disaster recovery.

## Release acceptance

Run the local flow above against the candidate build. Also retain the CI checks (`npm test`, lint, typecheck, and build) as the source-level gate. Payment processing remains unverified for real-bank operation until provider credentials, live webhook delivery, and settlement reconciliation are separately configured and exercised.
