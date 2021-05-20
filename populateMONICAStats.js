require("dotenv").config();
const { formatDistance } = require("date-fns");
const { it } = require("date-fns/locale");
const moment = require("moment");

const { chalk, info, er } = require("./utils/colored_console");
// load function to compute distances between GeoJSON points uses (geolib)
const { computeDistance } = require("./calcDistanceSession");
// load aggregation pipelines
const { pipelineStatsSessions, pipelineSumDistances } = require("./pipelines");

// to crypt email
const bcrypt = require("bcrypt");

// define if crypt or not email
const showEmail = process.env.SHOW_EMAIL;
const checkAllDB = Boolean(process.env.RETRIEVE_ALL);

exports.updateCollStats = async (startDate, coll, collMonicaStats) => {
  // is startDate is not undefined, i.e. a JSON file with
  // the last ran datetime exists and
  // RETRIEVE_ALL===false in .env file
  // add at the beginning of the pipeline a match stage
  if (startDate && !checkAllDB) {
    pipelineStatsSessions.unshift({
      $match: {
        StartDate: { $gt: startDate },
        //User: "ferlito.sergio@gmail.com",
        //StartDate: new Date("Thu, 04 Mar 2021 11:02:26 GMT"),
      },
    });
  }

  // get cursor from aggregation
  const cursor = await coll.aggregate(pipelineStatsSessions);
  // const testResult = await cursor.toArray();
  // console.log(JSON.stringify(testResult));

  // async trasverse docs from cursor
  for await (const doc of cursor) {
    console.log(doc.user);
    const hashEmail = await bcrypt.hash(doc.user, 5);
    let message;
    if (showEmail) {
      message = doc.user;
    } else {
      message = hashEmail;
    }
    console.log(`Computing Stats for user: ${message}...`);
    const { user, ...updates } = doc;
    // updates return
    // {numSessions: 7,
    // lastSession: Wed Jan 20 2021 15:50:49 GMT+0100 (Central European Standard Time),
    // sessionsID: Array(7)}
    //
    //
    // updates.sessionsID[0] is
    // {id: ObjectID}
    // id:ObjectID {_bsontype: 'ObjectID', id: Buffer(12)}

    // find record by user email from monica_calibrated collection
    const query = { user: user };

    // compute in parallel all distances for each session of each user
    await Promise.all(
      doc.sessionsID.map(async (element) => {
        // find doc in monica_calibrated by id
        const docMONICA = await coll.findOne({ _id: element.id });
        // compute distance passing array of Samples (geoJSON distance using geolib)
        const distance = await computeDistance(docMONICA.Samples);
        // add distance to element
        // each element is as
        // { id: ObjectId("6006c5bd766c633bcb34972e"), distance: 27 }
        element.distance = distance;
      })
    );
    // // sum up all sessions distances
    // const totalSessionsDistance = doc.sessionsID.reduce((acc, curr) => {
    //   acc = acc + curr.distance;
    //   return acc;
    // }, 0);
    // // add property totalDistance
    // updates.totalDistance = totalSessionsDistance;

    // sum up all sessions distances
    const totals = doc.sessionsID.reduce(
      (acc, curr) => {
        acc["dist"] = acc["dist"] + curr.distance;
        acc["time"] = acc["time"] + curr.diff;
        return acc;
      },
      { dist: 0, time: 0 }
    );
    // add property totalDistance
    updates.totalDistance = totals.dist;
    updates.totalTimeIT = formatDistance(0, totals.time, { locale: it });
    updates.totalTimeEN = formatDistance(0, totals.time);

    // add to previously value saved if it exists otherwise
    // set newly computed doc
    let update;
    const options = { upsert: true };
    // first check if the user yet exists in monica_stats collection
    const checkExist = await collMonicaStats.findOne(query);
    // if exist increment numSessions field and add session to array "sessionsID"
    // '[
    //   {
    //     "id": "60a13b93f9a3e6d345166ed6",
    //     "distance": 9567
    //   },
    //   {
    //     "id": "60a0f422f9a3e6d345166ed4",
    //     "distance": 0
    //   },
    //   {
    //     "id": "60a139ecf9a3e6d345166ed5",
    //     "distance": 788
    //   }
    // ]'
    if (checkExist) {
      if (updates.sessionsID.length > 1) {
        // updates.sessionsID is an array then
        // add multiple element to array using each
        update = {
          $inc: { numSessions: updates.numSessions },
          $addToSet: { sessionsID: { $each: updates.sessionsID } },
        };
      } else {
        // updates.sessionsID is an array of one element
        // then add a single object
        update = {
          $inc: { numSessions: updates.numSessions },
          $addToSet: { sessionsID: { ...updates.sessionsID[0] } },
        };
      }

      // if user does not exists use updates to add all
    } else {
      update = { $set: updates };
    }
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // update monica_stats
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const result = await collMonicaStats.updateOne(query, update, options);

    // result.upsertedCount===0 means that a doc already exists
    // in this case the totalDistance has to be updated
    if (result.upsertedCount === 0) {
      // add a first $match stage to filter by user email
      const pipeline = pipelineSumDistances(user);

      // first compute sum of all distances in array
      const arrResultDist = await collMonicaStats
        .aggregate(pipeline) // returns a cursor
        .toArray(); // convert to Array as the result of agg is a single value/doc

      const { totTimeMS, totDistance } = arrResultDist[0];
      console.log(`stats: ${JSON.stringify(arrResultDist[0], null, 2)}`);
      // updates field totalDistance
      await collMonicaStats.updateOne(
        { user: user },
        {
          $set: {
            totalDistance: totDist,
            totalTimeIT: formatDistance(0, totMS, { locale: it }),
            totalTimeEn: formatDistance(0, totMS),
          },
        }
      );
    }
    // each doc in monica_stats collection is
    //   { _id: ObjectId("609f72d8cad27b6e7f263112"),
    //   user: 'ferlito.sergio@gmail.com',
    //   lastSession: 2021-03-04T16:20:00.000Z,
    //   numSessions: 8,
    //   sessionsID:
    //    [ { id: ObjectId("603761f30687160ffb817820"), distance: 0 },
    //      { id: ObjectId("6040b0330687160ffb817829"), distance: 9567 },
    //      { id: ObjectId("6037794d0687160ffb817823"), distance: 788 },
    //      { id: ObjectId("60410ead0687160ffb81782b"), distance: 0 },
    //      { id: ObjectId("5fd0b53f5ea8baa6d9decdf1"), distance: 0 },
    //      { id: ObjectId("6006c5bd766c633bcb34972e"), distance: 27 },
    //      { id: ObjectId("60410c970687160ffb81782a"), distance: 0 },
    //      { id: ObjectId("6040ad220687160ffb817825"), distance: 13 } ],
    //   totalDistance: 10395 }

    // console.log(chalk.greenBright(JSON.stringify(doc, null, 2)));
    console.log(chalk.greenBright(`Done!`));
  }
};
