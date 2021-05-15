const schedule = require("node-schedule");
const rule = new schedule.RecurrenceRule();
const db = require("./dbMongo");
const { chalk, info, er } = require("./utils/colored_console");
// load utility function to GET/SET date last RUN
const { getOrSetStartDate } = require("./utils/handleStartDate");

// load
const { updateCollStats } = require("./getMONICAStats");

// define rule to schedule App at specific minutes every day
rule.minute = [42, 43, 30, 50, 52];

console.log(info(`App started at ${new Date()}!!`));

const job = async () => {
  const startDate = getOrSetStartDate();
  // retrive client from cb class
  const { client } = new db();

  try {
    // connect to MongoDB ReplicaSet
    // start new connection on each scheduled ran
    // const conn = await client.connect();
    // const { host, port } = conn.s.options.servers[0];
    // const { replicaSet } = conn.s.options;
    // console.log(
    //   info(
    //     `Successfully connected to mongodb host ${host} port ${port} replica set ${replicaSet}`
    //   )
    // );
    await client.connect();

    // define collection to query to extract stats (monica_calibrated)
    const coll = client.db("Air-Heritage").collection("monica_calibrated");
    // define destination collection (monica_stats)
    const collMonicaStats = client
      .db("Air-Heritage")
      .collection("monica_stats");
    console.log(chalk.white.bgBlueBright(`Scheduled ran at ${new Date()}`));
    // start populating  stats collection
    // close Mongodb collection at the end
    await updateCollStats(null, coll, collMonicaStats, client);

    // close MongoDB connection after ran schedule
    if (client) {
      await client.close();
      console.log(info(`Connection to db closed at ${new Date()}`));
    }
    // console.log(info(`Connection to db closed at ${new Date()}`));
  } catch (error) {
    //Close the connection to the MongoDB cluster and exit App
    console.log(er(`An error occured ${error}\nEXITING....`));
    await this.client.close();
    process.exit(1);
  }
};

// define schedule
schedule.scheduleJob(rule, async () => {
  job();
});

// https://docs.mongodb.com/drivers/node/fundamentals/crud/read-operations/cursor/
// https://www.npmjs.com/package/bree (other scheduler for node)

// https://blog.logrocket.com/implementing-a-secure-password-reset-in-node-js/
