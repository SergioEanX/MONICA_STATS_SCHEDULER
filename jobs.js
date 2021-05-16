// load MongoDB db CLASS
const db = require("./dbMongo");
// load chalk to colored console logs
const { chalk, info, er } = require("./utils/colored_console");
// load utility function to GET/SET date last RUN
const { getOrSetStartDate } = require("./utils/handleStartDate");
// load
const { updateCollStats } = require("./populateMONICAStats");
exports.job = async () => {
  const startDate = getOrSetStartDate();
  // retrive client from cb class
  const { client } = new db();

  try {
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

    //await updateCollStats(null, coll, collMonicaStats, client);

    await updateCollStats(startDate, coll, collMonicaStats, client);

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
