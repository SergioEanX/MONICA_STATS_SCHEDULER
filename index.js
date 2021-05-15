const schedule = require("node-schedule");
const rule = new schedule.RecurrenceRule();
const chalk = require("chalk");
const info = chalk.keyword("white").bgGreen;
const er = chalk.keyword("white").bgRedBright;
const db = require("./dbMongo");
// load utility function to GET/SET date last RUN
const { getOrSetStartDate } = require("./utils/handleStartDate");

// load
const { updateCollStats } = require("./collStats");
// define rule to schedule App at specific minutes every day
rule.minute = [31, 15, 30, 45];
const log = console.log;
log(info(`App started at ${new Date()}!!`));

// define schedule
const job = schedule.scheduleJob(rule, async () => {
  const startDate = getOrSetStartDate();
  // connect to MongoDB ReplicaSet
  await db.connect();
  const { client } = db;
  const coll = client.db("Air-Heritage").collection("monica_calibrated");
  const collMonicaStats = client.db("Air-Heritage").collection("monica_stats");
  log(chalk.white.bgBlueBright(`Scheduled ran at ${new Date()}`));
  await updateCollStats(startDate, coll, collMonicaStats, client);
});

// https://docs.mongodb.com/drivers/node/fundamentals/crud/read-operations/cursor/
