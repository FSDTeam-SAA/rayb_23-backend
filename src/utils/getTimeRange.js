const getTimeRange = (range) => {
  const now = new Date();
  if (range === "day") {
    now.setHours(0, 0, 0, 0); // Start of today
    return now;
  } else if (range === "last-7") {
    now.setDate(now.getDate() - 7);
    now.setHours(0, 0, 0, 0);
    return now;
  } else if (range === "last-30") {
    now.setDate(now.getDate() - 30);
    now.setHours(0, 0, 0, 0);
    return now;
  } else {
    return new Date(0); // fallback: match all
  }
};


module.exports = getTimeRange;
