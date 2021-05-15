const { MongoClient } = require("mongodb");
const { chalk, info, er } = require("./utils/colored_console");
class db {
  /**
   * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
   * See https://docs.mongodb.com/drivers/node/ for more details
   */
  constructor() {
    const uri =
      "mongodb://monicadmin:Nitrox!100@127.0.0.1:27017?replicaSet=AirHeritage/Air-Heritage";
    /**
     * The Mongo Client you will use to interact with your database
     * See https://mongodb.github.io/node-mongodb-native/3.6/api/MongoClient.html for more details
     */
    this.client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 5000,
    });
  }
  async connect() {
    try {
      // Connect to the MongoDB cluster
      const conn = await this.client.connect();
      const { host, port } = conn.s.options.servers[0];
      const { replicaSet } = conn.s.options;
      console.log(
        info(
          `Successfully connected to mongodb host ${host} port ${port} replica set ${replicaSet}`
        )
      );
    } catch (err) {
      // Close the connection to the MongoDB cluster and exit App
      console.log(er(`An error occured ${err}\nEXITING....`));
      await this.client.close();
      process.exit(1);
    }
  }
  // async close() {
  //   if (this.client) {
  //     await this.client.close();
  //   }
  //   console.log(info(`Connection to db closed at ${new Date()}`));
  // }
}
module.exports = db;
