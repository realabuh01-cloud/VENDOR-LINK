# Connecting Resend email to VendorLink 📧

Goal: replace Supabase's built-in sender (2 emails/hour ❌) with Resend
(100 emails/day free ✅) so signup confirmations and magic links never hit
a rate limit again.

---

## Step 1 — Create a Resend account (3 min)

1. Go to **https://resend.com** → **Sign up** (use the email you want to manage it with)
2. Left sidebar → **API Keys** → **Create API Key**
   - Name: `vendorlink`
   - Permission: **Sending access** (default)
   - Copy the key immediately — it starts with `re_` and is shown only once

---

## Step 2 — Verify a domain (the one step people miss) ⚠️

Resend will only deliver email to **any** address from a domain **you own and
verify**. Without this, only your own Resend account email can receive mail
(test mode), so customers would never get confirmations.

1. Resend → left sidebar → **Domains** → **Add Domain**
2. Enter a domain you own (e.g. `yourstore.com` — if you don't have one,
   see the note at the bottom)
3. Resend shows 2–3 DNS records (MX, TXT/SPF, DKIM)
4. Log into your domain registrar (Namecheap, GoDaddy, Whogohost, QServers…)
   → DNS settings → add each record exactly as shown
5. Back in Resend → click **Verify DNS Records**
   - Usually flips to "Verified" within minutes, occasionally a few hours
6. Your sender email will be something like `noreply@yourstore.com`

---

## Step 3 — Connect to Supabase (2 min)

1. **Supabase dashboard → Authentication → SMTP Settings**
2. Toggle **Enable Custom SMTP** → ON
3. Fill in:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key (`re_…`) |
| Sender email | `noreply@yourstore.com` (your verified domain) |
| Sender name | `VendorLink` |

4. Click **Save**

---

## Step 4 — Test

**Test 1 (instant):** In the same SMTP Settings page → **Send test email**
→ use your own email → check your inbox (and Resend → **Emails** log).

**Test 2 (real):** On your live site, sign up a new account → the
confirmation email should arrive within seconds, from "VendorLink".

---

## Step 5 — Turn email confirmation back ON

**Supabase → Authentication → Sign In / Providers → Email**:
- Set **"Confirm email"** → **ON** (it was probably turned off earlier to
  dodge the rate limit — now it's safe to require verification again)
- Leave the other Email settings at default

---

## Step 6 — Fix users stuck "unconfirmed" from before

Old unconfirmed users don't get retroactive emails. Two options:
- Supabase → **Authentication → Users** → ⋮ → **Confirm user** (instant)
- Or they click **"Resend confirmation"** — the login screen already shows
  this link, and it now sends through Resend

---

## Limits & notes

- **Resend free tier:** 100 emails/day, 3,000/month — plenty for signups
- Emails show as sent from `noreply@yourstore.com` (branded, professional)
- Supabase's 2/hour limit no longer applies — Resend's limits do
- Keep the API key safe: it sits in Supabase's SMTP settings (server-side),
  never in the app or Vercel env

---

## No domain yet? Options

| Path | Cost | Effort |
|---|---|---|
| Buy any cheap domain (.com/.ng/.xyz) | ~₦2,000–15,000/yr | Best long-term — branded emails |
| **Gmail SMTP fallback (no domain needed)** | Free | 5 min — emails come from `yourbusiness@gmail.com` instead of a branded domain |
| Skip SMTP, keep Supabase default | Free | Back to the 2/hour limit ❌ |

### Gmail fallback (works today, no domain)
- Google Account → **Security** → turn on **2-Step Verification**
- Then **Security → App passwords** → create one for "Mail"
- Supabase SMTP settings:

| Field | Value |
|---|---|
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | your full Gmail address |
| Password | the 16-character app password (not your Gmail password) |
| Sender email | your Gmail address |
| Sender name | `VendorLink` |
