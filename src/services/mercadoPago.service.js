const { MercadoPagoConfig, Payment, Preference, WebhookSignatureValidator } = require("mercadopago");

const { InvalidWebhookSignatureError } = require("mercadopago");

const getClient = () => {
  if (!process.env.MP_ACCESS_TOKEN) throw new Error("Falta configurar MP_ACCESS_TOKEN");
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN, options: { timeout: 10000 } });
};

const createPreference = async (body, idempotencyKey) => {
  const preference = new Preference(getClient());
  return preference.create({ body, requestOptions: { idempotencyKey } });
};

const getPayment = async (id) => {
  const payment = new Payment(getClient());
  return payment.get({ id });
};

const validateWebhookSignature = (req) => {
  if (!process.env.MP_WEBHOOK_SECRET) {
    throw new Error("Falta configurar MP_WEBHOOK_SECRET");
  }
  WebhookSignatureValidator.validate({
    xSignature: req.headers["x-signature"],
    xRequestId: req.headers["x-request-id"],
    dataId: req.query["data.id"] || req.body?.data?.id,
    secret: process.env.MP_WEBHOOK_SECRET,
    toleranceSeconds: 300,
  });
};

const isInvalidWebhookSignature = (error) => error instanceof InvalidWebhookSignatureError;

module.exports = {
  createPreference,
  getPayment,
  validateWebhookSignature,
  isInvalidWebhookSignature,
};
