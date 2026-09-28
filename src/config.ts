/**
 * The help address: a real Zoho mailbox on littlenestlearning.app, read by the
 * team. Empty would keep "Send feedback" out of Help. Do not invent an email here.
 */
export const feedbackEmail: string = "hello@littlenestlearning.app";

export const showHelpContact = feedbackEmail !== "";

import { PRODUCT_NAME } from "./brand";

/**
 * Public page shared from Grown-ups. No referral code and no tracking parameters.
 * littlenestlearning.app is the planned domain and is not purchased yet, so this
 * stays the GitHub Pages demo. The site path stays /Kids-app/.
 */
export const shareUrl = "https://ankitshahy-crypto.github.io/Kids-app/";

export const shareMessage = `${PRODUCT_NAME} is reading, math, colors, games and coding, time and money, building, and science for ages 3–7. Five happy minutes a day.`;

/**
 * The one-time unlock in App Store Connect (a non-consumable, Family Sharing on).
 * The price lives there, not here: the app shows whatever the App Store says.
 */
export const unlockProductId = "com.triagedesk.littlenest.full";
