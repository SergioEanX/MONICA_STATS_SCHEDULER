const { pipelineSumDistances } = require("./pipelines");
const { chalk, info, er } = require("./utils/colored_console");
const { formatDistance } = require("date-fns");
const { it } = require("date-fns/locale");
const { logger } = require("./utils/logger");
exports.updateMonicaStats = async (
  collMonicaStats,
  update,
  options,
  userEmail
) => {
  const result = await collMonicaStats.updateOne(
    { user: userEmail },
    update,
    options
  );

  // result.upsertedCount===0 means that a doc already exists
  // in this case the totalDistance and  totalTimeIT/EN have to be updated
  // otherwise process is done
  let messageDone;
  if (result.upsertedCount === 0) {
    // add a first $match stage to filter by user email
    const pipeline = pipelineSumDistances(userEmail);

    messageDone = `Done updating user: ${userEmail}`;

    // first compute sum of all distances in array
    const arrResultDist = await collMonicaStats
      .aggregate(pipeline) // returns a cursor
      .toArray(); // convert to Array as the result of agg is a single value/doc

    const { totTimeMS, totDistance } = arrResultDist[0];
    console.log(`stats: ${JSON.stringify(arrResultDist[0], null, 2)}`);
    // updates field totalDistance, numSessions & totalTimeIT/EN
    // [] are required to allow $size query
    await collMonicaStats.updateOne({ user: userEmail }, [
      {
        $set: {
          totalDistance: totDistance,
          totalTimeIT: formatDistance(0, totTimeMS, { locale: it }),
          totalTimeEN: formatDistance(0, totTimeMS),
          numSessions: { $size: "$sessionsID" },
        },
      },
    ]);
  } else {
    // update numSessions only
    // [] are required to allow $size query
    await collMonicaStats.updateOne({ user: userEmail }, [
      {
        $set: {
          numSessions: { $size: "$sessionsID" },
        },
      },
    ]);
    messageDone = `Done inserting NEW user: ${userEmail}`;
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
  console.log(chalk.greenBright(messageDone));
  logger.info(messageDone);
};
