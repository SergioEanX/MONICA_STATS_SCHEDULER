const schedule = require("node-schedule");
const rule = new schedule.RecurrenceRule();
const db = require("./dbMongo");
const { chalk, info } = require("./utils/colored_console");
// load utility function to GET/SET date last RUN
const { getOrSetStartDate } = require("./utils/handleStartDate");

// load
const { updateCollStats } = require("./collStats");
// define rule to schedule App at specific minutes every day
rule.minute = [09, 18, 30, 52];

console.log(info(`App started at ${new Date()}!!`));

// define schedule
const job = schedule.scheduleJob(rule, async () => {
  const startDate = getOrSetStartDate();
  // connect to MongoDB ReplicaSet
  // start new connection on each scheduled ran
  await db.connect();
  // retrive client from cb class
  const { client } = db;
  // define collection to query to extract stats (monica_calibrated)
  const coll = client.db("Air-Heritage").collection("monica_calibrated");
  // define destination collection (monica_stats)
  const collMonicaStats = client.db("Air-Heritage").collection("monica_stats");
  console.log(chalk.white.bgBlueBright(`Scheduled ran at ${new Date()}`));
  // start populating  stats collection
  // close Mongodb collection at the end
  await updateCollStats(startDate, coll, collMonicaStats, client);
});

// https://docs.mongodb.com/drivers/node/fundamentals/crud/read-operations/cursor/
