# Telegram super-admin bot (@naaoanwj_bot)

Only Telegram files were added; nothing else in the site was changed.

## 1. Vercel environment variables
Add these in Vercel → Project → Settings → Environment Variables (values come from your Lovable project's connected Telegram secrets):
- TELEGRAM_API_KEY
- LOVABLE_API_KEY
- SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL (already needed by your site)

Redeploy after adding them.

## 2. Database
The bot tables are already in your live database. The SQL files are in drizzle/migrations/0006 and 0007 for reference only — do not run them again.

## 3. Point the bot to shellbooks.app
After deploying, run once (replace values):

    SECRET=$(node -e "console.log(require('crypto').createHash('sha256').update('telegram-webhook:'+process.env.TELEGRAM_API_KEY).digest('base64url'))")
    curl -X POST https://connector-gateway.lovable.dev/telegram/setWebhook \
      -H "Authorization: Bearer $LOVABLE_API_KEY" -H "X-Connection-Api-Key: $TELEGRAM_API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"url\":\"https://shellbooks.app/api/public/telegram/webhook\",\"secret_token\":\"$SECRET\",\"allowed_updates\":[\"message\"]}"

## 4. Pair your account
shellbooks.app/admin → Telegram tab → Link Telegram → send the /link code to @naaoanwj_bot → Refresh → Confirm account. Then send /help.
