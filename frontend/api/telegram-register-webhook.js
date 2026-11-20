export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const setupSecret =
    process.env.TELEGRAM_SETUP_SECRET;

  const receivedSecret =
    req.headers.authorization;

  if (
    !setupSecret ||
    receivedSecret !== `Bearer ${setupSecret}`
  ) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const webhookSecret =
    process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token || !webhookSecret) {
    return res.status(500).json({
      error: 'Missing environment variables',
    });
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          url: 'https://watchmix.vercel.app/api/telegram-webhook',

          secret_token: webhookSecret,

          allowed_updates: [
            'inline_query',
          ],
        }),
      }
    );

    const data = await response.json();

    return res.status(
      response.ok ? 200 : 502
    ).json(data);

  } catch (error) {
    console.error(
      '[telegram-register-webhook]',
      error
    );

    return res.status(500).json({
      error: 'Telegram API request failed',
    });
  }
}