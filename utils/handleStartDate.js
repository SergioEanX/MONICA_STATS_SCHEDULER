const fs = require("fs");
const path = require("path");
// load chalk colored console.log
const { info } = require("./colored_console");
const pathFile = path.join(__dirname, "../lastRUN.json");

// read and write file synchronously
// save datetime last run in "lastRUN.json"
exports.getStartDate = () => {
  let startDate;
  if (fs.existsSync(pathFile)) {
    const data = fs.readFileSync(pathFile);
    startDate = new Date(JSON.parse(data).lastRun);
    console.log(info(`LAST DB QUERY AT ${startDate}`));
  }
  // returns undefined if no JSON file was found otherwise returns the
  // startDate
  return startDate;
};
exports.updateStartDate = (t) => {
  let data = JSON.stringify({ lastRun: t });
  fs.writeFileSync(pathFile, data);
  console.log(info(`LAST RUN updated to ${t}`));
};
