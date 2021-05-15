/* eslint-disable camelcase */
const { getDistance } = require("geolib/es");

// given an array of Samples return a new array with added
// a "distance" property containing the distance in meters
// between current sample and the preceding one
exports.computeDistance = (data) =>
  // add distace field to example data
  new Promise((resolve) => {
    let totalDist = 0;
    const result = data.reduce((acc, curr) => {
      if (acc.length) {
        const [long_acc, lat_acc] = [...acc.slice(-1)[0].location.coordinates];
        const [long_curr, lat_curr] = [...curr.location.coordinates];
        //   console.log({ latitude: lat_curr, longitude: long_curr });
        //   console.log({ latitude: lat_acc, longitude: long_acc });
        const dist = getDistance(
          { latitude: lat_acc, longitude: long_acc },
          { latitude: lat_curr, longitude: long_curr }
        );
        // console.log('Dist:' + dist);
        // eslint-disable-next-line no-param-reassign
        curr.distance = dist;
        totalDist += dist;
        //console.log(`Distance ${dist} (total=${totalDist})`);
      }
      if (!acc.length) {
        // eslint-disable-next-line no-param-reassign
        curr.distance = 0;
      }
      acc.push(curr);
      return acc;
    }, []);
    //console.log(`Final totalDist=${totalDist}`);
    return resolve(totalDist);
  });
