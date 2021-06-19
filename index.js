// load node scheduler
const schedule = require("node-schedule");
// to define rule
const rule = new schedule.RecurrenceRule();
// load job to run
const { job } = require("./jobs");
const { info } = require("./utils/colored_console");

const { logger } = require("./utils/logger");

// define rule to schedule App at specific minutes every day
rule.minute = [07, 15, 30, 59];

console.log(info(`App started at ${new Date()}!!`));
logger.info(`Schedule run at ${new Date()}`);

// to run immediately
const runNow = false;

// run immediately or on schedule
if (runNow) {
  (async () => job())();
} else {
  //define schedule
  schedule.scheduleJob(rule, async () => {
    job();
  });
}

process.on("uncaughtException", (err) => {
  // Handle the error safely
  logger.error(
    `An uncaught error occured at ${new Date()}
    Error:${err}`
  );
});

process.on("unhandledRejection", (err) => {
  // Handle the error safely
  logger.error(
    `An unhandled Rejection error occured at ${new Date()}. 
    Error: ${err}
    exiting!!!`
  );
  process.exit(1);
});

// https://docs.mongodb.com/drivers/node/fundamentals/crud/read-operations/cursor/
// https://www.npmjs.com/package/bree (other scheduler for node)
// https://blog.logrocket.com/implementing-a-secure-password-reset-in-node-js/
