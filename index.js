// load node scheduler
const schedule = require("node-schedule");
// to define rule
const rule = new schedule.RecurrenceRule();
// load job to run
const { job } = require("./jobs");
const { info } = require("./utils/colored_console");

// define rule to schedule App at specific minutes every day
rule.minute = [0, 43, 33, 34, 35, 36];

console.log(info(`App started at ${new Date()}!!`));

// define schedule
schedule.scheduleJob(rule, async () => {
  job();
});

// https://docs.mongodb.com/drivers/node/fundamentals/crud/read-operations/cursor/
// https://www.npmjs.com/package/bree (other scheduler for node)

// https://blog.logrocket.com/implementing-a-secure-password-reset-in-node-js/
