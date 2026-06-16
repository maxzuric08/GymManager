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

const toPartsRecord = (formatter, value = new Date()) =>
  formatter.formatToParts(value).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

const getArgentinaDate = (value = new Date()) => {
  const parts = toPartsRecord(dateFormatter, value);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getArgentinaTime = (value = new Date()) => {
  const parts = toPartsRecord(timeFormatter, value);
  return `${parts.hour}:${parts.minute}:${parts.second}`;
};

const getArgentinaTimeShort = (value = new Date()) => getArgentinaTime(value).slice(0, 5);

module.exports = {
  ARGENTINA_TIME_ZONE,
  getArgentinaDate,
  getArgentinaTime,
  getArgentinaTimeShort,
};
