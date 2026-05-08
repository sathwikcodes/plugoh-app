# Plugoh Azure Runbook

## Quarterly Secret Rotation

1. Generate new credentials for each integration in this order: Supabase service role key, Supabase anon key, Razorpay keys/webhook secret, Resend key, Instagram app secret, Anthropic key, internal cron/internal secret, Redis connection string.
2. Write new values to Azure Key Vault first. Keep old values active until deployment succeeds.
3. Trigger API deployment so Container Apps revisions load the new `secretRef` values.
4. Run smoke tests:
   - `GET /healthz/ready`
   - `POST /payment/verify-escrow` with idempotency key replay
   - Instagram connect callback flow
5. Revoke old credentials at source providers.
6. Confirm no failures in App Insights Failures blade for 1 hour.

## Emergency Key Compromise

1. Rotate compromised key immediately at provider.
2. Update matching Key Vault secret.
3. Force new Container Apps revision and shift traffic once readiness is green.
4. Audit logs for abuse window and export incident timeline.
