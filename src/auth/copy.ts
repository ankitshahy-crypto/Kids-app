import { PRODUCT_NAME } from "../brand";

export const KIDS_NEVER_LOGIN = "Kids never log in. A child taps their animal.";

export const ACCOUNT_OFF = [
  "Sign-in is optional. This copy of LittleNest has no sign-in setup, so profiles stay on this device.",
  KIDS_NEVER_LOGIN,
  `${PRODUCT_NAME} does not ask for a card or a payment.`,
] as const;

export const ACCOUNT_ON_NOTE = `Sign-in is optional. Without an account, ${PRODUCT_NAME} stays on this device and works offline.`;

export const SYNC_LABEL = "Back up & sync progress";

export const TEACHER_NOTE =
  "Teacher is a flag for now. Class sign-in with Google, Clever, or ClassLink comes later. Children still tap their animal. They never log in.";

export const BACKUP_NOTE =
  "A backup stores a first name or initial, an animal, an age range, stars, lesson progress, and these grown-up settings. Photos stay on this device. There are no ads and no analytics.";

export const PRIVACY_LINES = [
  `${PRODUCT_NAME} keeps information on this device unless a grown-up turns on backup.`,
  "A profile stores a first name or one initial, an age range, and an animal that is already in the app.",
  "Photos are not uploaded. The app does not take pictures. Photos are not part of a backup.",
  "There is no health data and no diagnosis.",
  "There are no ads and no tracking.",
  "A grown-up can sign in from Account and turn on Back up & sync progress. Kids never log in.",
  "That backup stores a first name or initial, an animal, stars, lesson progress, and grown-up settings. The grown-up's email stays with Apple, Google, or the email sign-in. It is not the child's name.",
  "Delete all data and Delete account are in Account.",
  "Nothing is sent to a school. Class linking is not available yet.",
] as const;
