exports.pipelineStatsSessions = [
  {
    $group: {
      _id: "$User",
      // groupby User and sum up all docs in monica_calibrated
      numSessions: {
        $sum: 1,
      },
      // last StartDate for each User (check sort:1)
      lastSession: {
        $last: "$StartDate",
      },
      // create an array of ObjectID relating to id of documents in
      // monica_calibrated collection belonging to each User
      sessionsID: {
        $addToSet: {
          id: "$_id",
          Device: "$DeviceAFE",
          start: "$StartDate",
          end: "$EndDate",
          diff: { $subtract: ["$EndDate", "$StartDate"] },
        },
      },
    },
  },
  {
    $project: {
      _id: 0,
      user: "$_id",
      lastSession: 1,
      numSessions: 1,
      sessionsID: 1,
    },
  },
];

exports.pipelineSumDistances = [
  // for each element in the array of collection monica_stats.sessionsID
  // accumulate the distance property to provide totDistance
  {
    $project: {
      totDistance: {
        $reduce: {
          input: "$sessionsID",
          initialValue: 0,
          in: {
            $add: ["$$value", "$$this.distance"],
          },
        },
      },
      totTimeMS: {
        $reduce: {
          input: "$sessionsID",
          initialValue: 0,
          in: {
            $add: ["$$value", "$$this.diff"],
          },
        },
      },
    },
  },
];
