// load function to compute distances between GeoJSON points uses (geolib)
const { computeDistance } = require("./calcDistanceSession");
// load aggregation pipelines
const { pipelineStatsSessions, pipelineSumDistances } = require("./pipelines");

exports.updateCollStats = async (startDate, coll, collMonicaStats, client) => {
  // is startDate is notundefined, i.e. a JSON file with
  // the last ran datetime exists
  // add at the beginning of the pipeline a match stage
  if (startDate) {
    pipelineStatsSessions.unshift({
      $match: {
        StartDate: { $gte: startDate },
        //User: "ferlito.sergio@gmail.com",
        //StartDate: new Date("Thu, 04 Mar 2021 11:02:26 GMT"),
      },
    });
  }

  // get cursor from aggregation
  const cursor = await coll.aggregate(pipelineStatsSessions);

  // async trasverse docs from cursor
  for await (const doc of cursor) {
    const { user, ...updates } = doc;
    // updates return
    // {numSessions: 7,
    // lastSession: Wed Jan 20 2021 15:50:49 GMT+0100 (Central European Standard Time),
    // sessionsID: Array(7)}
    //     updates.sessionsID[0]
    // {id: ObjectID}
    // id:ObjectID {_bsontype: 'ObjectID', id: Buffer(12)}
    // __proto__:Object

    // query for updates
    // find record by user email
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
    // sum up all sessions distances
    const totalSessionsDistance = doc.sessionsID.reduce((acc, curr) => {
      acc = acc + curr.distance;
      return acc;
    }, 0);
    // add property totalDistance
    updates.totalDistance = totalSessionsDistance;

    // add to previously value saved if it exists otherwise set newly computed doc
    const update = { $set: updates };
    const options = { upsert: true };
    const result = await collMonicaStats.updateOne(query, update, options);
    // result.upsertedCount===0 means that a doc already exists
    // in this case the totalDistance has to be updated
    if (result.upsertedCount === 0) {
      // first compute sum of all distances in array
      const arrResultDist = await collMonicaStats
        .aggregate(pipelineSumDistances) // returns a cursor
        .toArray(); // convert to Array as the result of agg is a single value/doc

      // updates field totalDistance
      await collMonicaStats.updateOne(query, {
        $set: {
          totalDistance: arrResultDist[0].totDistance,
        },
      });
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

    // log(chalk.greenBright(JSON.stringify(doc, null, 2)));
  }
  await client.close();
  log(info(`Connection to db closed at ${new Date()}`));
};
