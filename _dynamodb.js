"use strict";

const AWS = require("aws-sdk");

let options = {};

// connect to local DB if running offline
if (process.env.IS_OFFLINE) {
  options = {
    region: "localhost",
    endpoint: "http://localhost:8000",
  };
  console.log("Options", options);
}

const dynamodb = new AWS.DynamoDB.DocumentClient(options);

async function deleteDomain(idp, domain) {
  const params = {
    TableName: process.env.DOMAINS_TABLE,
    Key: {
      domain,
      idp,
    },
    ReturnValues: "ALL_OLD",
  };

  console.log("Delete Domain Item", JSON.stringify(params));

  // delete the domain from the database
  return dynamodb.delete(params).promise();
}

async function deleteVerification(idp, domain) {
  const params = {
    TableName: process.env.VERIFICATIONS_TABLE,
    Key: {
      domain,
      idp,
    },
    ReturnValues: "ALL_OLD",
  };

  console.log("Delete Verification Item", JSON.stringify(params));

  // delete the verification from the database
  return dynamodb.delete(params).promise();
}

module.exports = {
  client: dynamodb,
  deleteDomain,
  deleteVerification,
};
