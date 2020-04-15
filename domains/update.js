"use strict";

const middy = require("middy");
const { cors } = require("middy/middlewares");

const updateDomain = async () => {
  return {
    statusCode: 405,
    headers: {
      "Content-Type": "application/json",
    },
  };
};

const handler = middy(up).use(cors()); // Adds CORS headers to responses

module.exports = { handler };
