require("dotenv").config();
const { formatDistance } = require("date-fns");
const { it } = require("date-fns/locale");
const moment = require("moment");

// load function to compute distances between GeoJSON points uses (geolib)
const { computeDistance } = require("./calcDistanceSession");
// load aggregation pipelines
const { pipelineStatsSessions } = require("./pipelines");

const { updateMonicaStats } = require("./dbQueries");
// to crypt email
const bcrypt = require("bcrypt");

// define if crypt or not email
const showEmail = process.env.SHOW_EMAIL;
const checkAllDB = process.env.RETRIEVE_ALL === "true";

exports.updateCollStats = async (startDate, coll, collMonicaStats) => {
  // if startDate is not undefined, i.e. a JSON file with
  // the last ran datetime exists and
  // RETRIEVE_ALL===false in .env file
  // add at the beginning of the pipeline a $match stage
  // to retrieve only recent docs from monica_calibrated collection
  if (startDate && !checkAllDB) {
    pipelineStatsSessions.unshift({
      $match: {
        StartDate: { $gt: startDate },
        //User: "savdevito@gmail.com",
        //StartDate: new Date("Thu, 04 Mar 2021 11:02:26 GMT"),
      },
    });
  }
  console.log(JSON.stringify(pipelineStatsSessions, null, 2));

  // get cursor from aggregation
  const cursor = await coll.aggregate(pipelineStatsSessions);
  // const testResult = await cursor.toArray();
  // console.log(JSON.stringify(testResult));

  // async trasverse docs from cursor
  // for each group "user" find all his/her
  // sessions and compute distance [m] of each one
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
    // updates returns somethins as
    // {numSessions: 7,
    // lastSession: Wed Jan 20 2021 15:50:49 GMT+0100 (Central European Standard Time),
    // sessionsID: Array(7)}
    //
    //
    // updates.sessionsID[0] is an Object as
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

    // having computed distance and time duration (diff)
    // of each session sum all them up
    const totals = doc.sessionsID.reduce(
      (acc, curr) => {
        acc["dist"] = acc["dist"] + curr.distance;
        acc["time"] = acc["time"] + curr.diff;
        return acc;
      },
      { dist: 0, time: 0 } // set initial object with dist and time = 0
    );
    // add property totalDistance
    updates.totalDistance = totals.dist;
    // add  human readable totalTime strings in IT & EN
    updates.totalTimeIT = formatDistance(0, totals.time, { locale: it });
    updates.totalTimeEN = formatDistance(0, totals.time);

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // HAVING COMPUTED STATS THEN DEFINE UPDATE
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // first check if the user already exists in monica_stats collection
    const checkExist = await collMonicaStats.findOne(query);

    // define the update query
    // add to previously values saved if the user already exists otherwise
    // set newly computed doc (so {upsert:true})
    let update;
    const options = { upsert: true };

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

    // if user exists in monica_stats collection
    // update has to
    // 1. update numSessions field
    // 2. add session(s) to array "sessionsID"
    if (checkExist) {
      // user already in DB
      if (updates.sessionsID.length > 1) {
        // updates.sessionsID is an array of more than one element
        // add multiple element to array using $each
        update = {
          // numSessions: { $size: "$sessionsID" },
          $addToSet: { sessionsID: { $each: updates.sessionsID } },
        };
      } else {
        // updates.sessionsID is an array of ONE element only
        // then add a single object
        update = {
          // numSessions: { $size: "$sessionsID" },
          $addToSet: { sessionsID: { ...updates.sessionsID[0] } },
        };
      }

      // user NOT in DB yet (simple update using $set)
    } else {
      // in this case updates is something as
      // {
      //   "numSessions": 16,
      //   "lastSession": "2021-03-30T10:39:58.000Z",
      //   "sessionsID": [
      //     {
      //       "id": "60619a9d0687160ffb81788c",
      //       "Device": "AirH337",
      //       "start": "2021-03-29T09:15:07.000Z",
      //       "end": "2021-03-29T09:16:03.000Z",
      //       "diff": 56000,
      //       "distance": 1
      //     },
      //       ..................
      //     {
      //       "id": "6062fffe0687160ffb8178a1",
      //       "Device": "AirH361",
      //       "start": "2021-03-30T10:39:58.000Z",
      //       "end": "2021-03-30T10:41:59.000Z",
      //       "diff": 121000,
      //       "distance": 112
      //     }
      //   ],
      //   "totalDistance": 646,
      //   "totalTimeIT": "15 minuti",
      //   "totalTimeEN": "15 minutes"
      // }
      update = { $set: updates };
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    // after having defined updates
    // perform the appropriate updateOne
    // for monica_stats collection
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    console.log(JSON.stringify(update, null, 2));
    await updateMonicaStats(collMonicaStats, update, options, user);
  }
};
