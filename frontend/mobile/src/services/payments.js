// Payment for pickup orders with Stripe PaymentSheet.
//
// Production flow (native development build; PaymentSheet does not run in
// Expo Go or on web):
//   1. npx expo install @stripe/stripe-react-native  (+ its config plugin in app.json)
//   2. Wrap the app in <StripeProvider publishableKey=... merchantIdentifier=...>
//   3. Here, with useStripe():
//        const { paymentIntent, ephemeralKey, customer } = await api.post('/orders', { branchId, items, usePoints });
//        await initPaymentSheet({
//          merchantDisplayName: 'SNIPP',
//          paymentIntentClientSecret: paymentIntent,
//          customerEphemeralKeySecret: ephemeralKey,
//          customerId: customer,
//          defaultBillingDetails: { name: client.name, email: client.email },
//          returnURL: 'snipp://pago',
//        });
//        const { error } = await presentPaymentSheet();
//   4. The order is confirmed by the backend from the Stripe webhook
//      (payment_intent.succeeded), never from the app alone.
//
// The amount is always computed on the server; the app only sends products,
// quantities and whether to use points.
//
// Until the backend exists, payOrder() simulates the result so the screens
// can show success, decline and cancel.

const DECLINE_MESSAGES = {
  card_declined: 'Tu banco rechazó el pago.',
  insufficient_funds: 'La tarjeta no tiene saldo suficiente.',
  expired_card: 'La tarjeta está vencida.',
  incorrect_cvc: 'El código de seguridad no coincide.',
};

export function declineMessage(code) {
  return DECLINE_MESSAGES[code] ?? 'El pago no se pudo completar.';
}

// result: { status: 'paid', reference } | { status: 'declined', code } | { status: 'canceled' }
// Card data never reaches the app or the database (RNF-G04); only the
// PaymentIntent id is kept as the transaction reference (RN-17).
export async function payOrder({ simulate = 'paid' } = {}) {
  await new Promise((r) => setTimeout(r, 1400));
  if (simulate === 'declined') return { status: 'declined', code: 'card_declined' };
  if (simulate === 'canceled') return { status: 'canceled' };
  return { status: 'paid', reference: `pi_demo_${Date.now().toString(36)}` };
}
