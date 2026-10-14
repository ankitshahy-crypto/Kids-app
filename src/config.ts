/**
 * The help address: a real Zoho mailbox on littlenestlearning.app, read by the
 * team. Empty would keep "Send feedback" out of Help. Do not invent an email here.
 */
export const feedbackEmail: string = "hello@littlenestlearning.app";

export const showHelpContact = feedbackEmail !== "";

import { PRODUCT_NAME } from "./brand";

/**
 * Public page shared from Grown-ups. No referral code and no tracking parameters.
 * The LittleNest website (the repo's website/ folder), never the GitHub demo.
 */
export const shareUrl = "https://littlenestlearning.app/";

/**
 * The privacy policy: the website's own page (website/privacy.html in this repo, published with the
 * page above). The Privacy page in Grown-ups links to it, behind the grown-up check like every link
 * out of the app. Check it opens before each App Store submission: the store's listing needs the
 * same address.
 */
export const privacyUrl = `${shareUrl}privacy.html`;

/** The privacy policy as linked under the buy button (the website's clean address). */
export const paywallPrivacyUrl = "https://littlenestlearning.app/privacy";

/** Terms of Use: Apple's standard licensed application end user license agreement. */
export const termsOfUseUrl = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

/**
 * Offer codes ("Have a code?", Apple's redeem sheet). Off for the 1.0 launch: no codes are set up
 * in App Store Connect yet, and the sheet needs iOS 16.3 or later, so App Review must never meet an
 * error there. The code path (redeemSchoolCode, StorePlugin.redeemCode) stays; turn this on to
 * bring the button back once codes exist.
 */
export const OFFER_CODES_ENABLED: boolean = false;

export const shareMessage = `${PRODUCT_NAME} is reading, math, colors, games and coding, time and money, building, and science for ages 3–7. Five happy minutes a day.`;

/**
 * The App Store listing, once it exists. The web demo's unlock page points
 * there in place of the purchase, which only the iPhone and iPad app can make.
 * Empty says "coming soon". Do not invent a link here.
 */
export const appStoreUrl: string = "";

/** The Google Play listing, once there is an Android app. Empty says "coming to Google Play". */
export const googlePlayUrl: string = "";

/**
 * The one-time unlock in App Store Connect (a non-consumable, Family Sharing on).
 * The price lives there, not here: the app shows whatever the App Store says.
 */
export const unlockProductId = "com.triagedesk.littlenest.full";
