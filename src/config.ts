/**
 * The help address. Empty keeps "Send feedback" out of Help, so pilot families
 * never write to an address that nobody reads. Set it to the real one when it
 * exists; do not invent an email here.
 */
export const feedbackEmail = "";

export const showHelpContact = feedbackEmail !== "";

import { PRODUCT_NAME } from "./brand";

/**
 * Public page shared from Grown-ups. No referral code and no tracking parameters.
 * littlenestlearning.app is the planned domain and is not purchased yet, so this
 * stays the GitHub Pages demo. The site path stays /Kids-app/.
 */
export const shareUrl = "https://ankitshahy-crypto.github.io/Kids-app/";

export const shareMessage = `${PRODUCT_NAME} is reading, math, colors, games and coding, time and money, building, and science for ages 3–7. Five happy minutes a day.`;
