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
type RazorpayImport = RazorpayModule | { default?: RazorpayModule };

export async function openRazorpayCheckout(options: RazorpayOptions): Promise<RazorpayResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const razorpayImport = require('react-native-razorpay') as RazorpayImport;
  const RazorpayCheckout = 'open' in razorpayImport ? razorpayImport : razorpayImport.default;
  if (!RazorpayCheckout?.open) {
    throw new Error('Razorpay checkout module is unavailable in this app build.');
  }
  const result = await RazorpayCheckout.open(options);
  if (!result.razorpay_order_id || !result.razorpay_payment_id || !result.razorpay_signature) {
    throw new Error('Razorpay checkout did not return payment verification details.');
  }
  return result;
}
