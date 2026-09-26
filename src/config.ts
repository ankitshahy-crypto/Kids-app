import { version } from "../package.json";

/** Shown on About. Matches package.json. */
export const appVersion = version;

export const appCredit = "WordNest by TriageDesk";

/**
 * Contact us stays out of Help until a help address is chosen.
 * Flip this when that address exists. Do not invent an email here.
 */
export const showHelpContact = false;
