const { MongoClient } = require("mongodb");
const chalk = require("chalk");
const info = chalk.keyword("white").bgGreen;
const log = console.log;
const er = chalk.keyword("white").bgRedBright;

// exports.client = async () => {
//   /**
//    * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
//    * See https://docs.mongodb.com/drivers/node/ for more details
//    */
//   const uri =
//     "mongodb://monicadmin:Nitrox!100@127.0.0.1:27017?replicaSet=AirHeritage";

//   /**
//    * The Mongo Client you will use to interact with your database
//    * See https://mongodb.github.io/node-mongodb-native/3.6/api/MongoClient.html for more details
//    */
//   const client = new MongoClient(uri, {
//     useUnifiedTopology: true,
//     connectTimeoutMS: 5000,
//   });

//   try {
//     // Connect to the MongoDB cluster
//     const conn = await client.connect();
//     const { host, port } = conn.s.options.servers[0];
//     log(
//       info(
//         `Successfully connected to mongodb host ${host} port ${port} replica set ${conn.s.options.replicaSet}`
//       )
//     );
//     return client;
//   } catch (err) {
//     // Close the connection to the MongoDB cluster and exit App
//     await client.close();
//     log(er(`An error occured ${err}\nEXITING....`));
//     process.exit(1);
//   }
// };
class db {
  /**
   * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
   * See https://docs.mongodb.com/drivers/node/ for more details
   */
  constructor() {
    const uri =
      "mongodb://monicadmin:Nitrox!100@127.0.0.1:27017?replicaSet=AirHeritage";
    /**
     * The Mongo Client you will use to interact with your database
     * See https://mongodb.github.io/node-mongodb-native/3.6/api/MongoClient.html for more details
     */
    this.client = new MongoClient(uri, {
      useUnifiedTopology: true,
      connectTimeoutMS: 5000,
    });
  }
  async connect() {
    try {
      // Connect to the MongoDB cluster
      const conn = await this.client.connect();
      const { host, port } = conn.s.options.servers[0];
      log(
        info(
          `Successfully connected to mongodb host ${host} port ${port} replica set ${conn.s.options.replicaSet}`
        )
      );
    } catch (err) {
      // Close the connection to the MongoDB cluster and exit App
      await this.client.close();
      log(er(`An error occured ${err}\nEXITING....`));
      process.exit(1);
    }
  }
}
module.exports = new db();
