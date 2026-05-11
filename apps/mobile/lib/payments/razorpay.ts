type RazorpayResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: string;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string; contact?: string; name?: string };
  theme?: { color?: string };
};

// react-native-razorpay has no type declarations; lazy-require to avoid Expo Go native module crash at load time
type RazorpayModule = { open: (options: RazorpayOptions) => Promise<RazorpayResult> };

export async function openRazorpayCheckout(options: RazorpayOptions): Promise<RazorpayResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RazorpayCheckout = require('react-native-razorpay') as RazorpayModule;
  return RazorpayCheckout.open(options);
}
