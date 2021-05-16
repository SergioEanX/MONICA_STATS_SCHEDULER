const fs = require("fs");
const path = require("path");
// load chalk colored console.log
const { info } = require("./colored_console");

// read and write file synchronously
// save datetime last run in "lastRUN.json"
exports.getOrSetStartDate = () => {
  const pathFile = path.join(__dirname, "../lastRUN.json");
  let startDate;
  if (fs.existsSync(pathFile)) {
    const data = fs.readFileSync(pathFile);
    startDate = new Date(JSON.parse(data).lastRun);
    console.log(info(`LAST DB QUERY AT ${startDate}`));
  } else {
    let data = JSON.stringify({ lastRun: new Date() });
    fs.writeFileSync(pathFile, data);
  }
  // returns undefined if no JSON file was found otherwise returns the
  // startDate
  return startDate;
};
