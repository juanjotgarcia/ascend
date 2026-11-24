/* Zelum subscriptions: RevenueCat project settings. Public by design (the SDK key only identifies the app;
   purchases are verified by Google Play and RevenueCat on their servers).
   Until revenuecatAndroidKey is set, the Android app shows the plans but can't sell them.
   Setup steps: PLAY-STORE.md → "Subscriptions". */
const BILLING_CONFIG = {
  revenuecatAndroidKey: null,   // "goog_…" from RevenueCat → Project settings → API keys → Google Play
  offering: 'default',          // RevenueCat offering that holds the five packages below
  // RevenueCat package identifiers (custom packages in the offering) → Google Play products
  packages: {
    basic_monthly: { plan: 'basic', period: 'monthly' },   // subscription zelum_basic, base plan "monthly"
    basic_annual:  { plan: 'basic', period: 'annual' },    // subscription zelum_basic, base plan "annual"
    pro_monthly:   { plan: 'pro',   period: 'monthly' },   // subscription zelum_pro, base plan "monthly"
    pro_annual:    { plan: 'pro',   period: 'annual' },    // subscription zelum_pro, base plan "annual" (7-day free trial)
    lifetime:      { plan: 'pro',   period: 'lifetime' },  // one-time product zelum_lifetime
  },
  // Entitlements in RevenueCat: Pro and Lifetime products grant both; Basic grants "basic"
  entitlements: { basic: 'basic', pro: 'pro' },
};
