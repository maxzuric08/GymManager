const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ARGENTINA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: ARGENTINA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const partsToRecord = (formatter, value = new Date()) =>
  formatter.formatToParts(value).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

export const getArgentinaDate = (value = new Date()) => {
  const parts = partsToRecord(dateFormatter, value);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const getArgentinaTime = (value = new Date()) => {
  const parts = partsToRecord(timeFormatter, value);
  return `${parts.hour}:${parts.minute}:${parts.second}`;
};

export const getArgentinaTimeShort = (value = new Date()) =>
  getArgentinaTime(value).slice(0, 5);

export const isFutureClassSlot = (classDate, startTime, now = new Date()) => {
  if (!classDate || !startTime) return false;
  const today = getArgentinaDate(now);
  const currentTime = getArgentinaTime(now);
  const normalizedDate = String(classDate).slice(0, 10);
  const normalizedTime = startTime.length === 5 ? `${startTime}:00` : startTime;
  return normalizedDate > today || (normalizedDate === today && normalizedTime > currentTime);
};

export const hasClassStarted = (classDate, startTime, now = new Date()) => {
  if (!classDate || !startTime) return false;
  const today = getArgentinaDate(now);
  const currentTime = getArgentinaTime(now);
  const normalizedDate = String(classDate).slice(0, 10);
  const normalizedTime = startTime.length === 5 ? `${startTime}:00` : startTime;
  return normalizedDate < today || (normalizedDate === today && normalizedTime <= currentTime);
};
