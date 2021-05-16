const pino = require("pino");

// Create a logging instance
const logger = pino(
  {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    // prettyPrint: {
    //   levelFirst: true,
    // },
  },
  pino.destination({
    dest: "./logs/my-file",
    //minLength: 4096, // Buffer before writing
    sync: false, // Asynchronous logging
  })
);

module.exports.logger = logger;
