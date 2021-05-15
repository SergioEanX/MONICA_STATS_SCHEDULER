const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const info = chalk.keyword("white").bgGrey;
const er = chalk.keyword("white").bgRedBright;
const log = console.log;
// read and write file synchronously
exports.getOrSetStartDate = () => {
  const pathFile = path.join(__dirname, "../lastRUN.json");
  let startDate;
  if (fs.existsSync(pathFile)) {
    const data = fs.readFileSync(pathFile);
    startDate = new Date(JSON.parse(data).lastRun);
    log(info(`LAST DB QUERY AT ${startDate}`));
  } else {
    let data = JSON.stringify({ lastRun: new Date() });
    fs.writeFileSync(pathFile, data);
  }
  // returns undefined if no JSON file was found otherwise returns the
  // startDate
  return startDate;
};
