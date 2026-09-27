/** Reading week 0 (M and A). Tests stay on this week when the calendar moves. */
export const pinnedReading = {
  version: 1,
  origin: "device",
  classId: "device-class",
  updatedAt: "2026-01-05T12:00:00.000Z",
  subjects: {
    reading: {
      classDefault: { subject: "reading", stageId: "letters", weekIndex: 0 },
      byChildId: {
        mia: { subject: "reading", stageId: "letters", weekIndex: 0 },
      },
    },
  },
};
