"use strict";

const AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies

let options = {};

// connect to local DB if running offline
if (process.env.IS_OFFLINE) {
  //if (true) {
  options = {
    region: "localhost",
    endpoint: "http://localhost:8000",
  };
  console.log("Options", options);
}

const client = new AWS.DynamoDB.DocumentClient(options);

module.exports = client;
