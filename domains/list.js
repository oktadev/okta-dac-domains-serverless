"use strict";

const middy = require("middy");
const { cors } = require("middy/middlewares");
const jsonHttpErrorHandler = require("../jsonHttpErrorHandler");
const _db = require("../_dynamodb");

const listDomains = async (event, context, callback) => {
  console.log("Query Parameters", event.queryStringParameters);
  let idp = event.queryStringParameters.idp;

  try {
    var params = {
      TableName: process.env.DOMAINS_TABLE,
      IndexName: "idps-" + process.env.DOMAINS_TABLE,
      KeyConditionExpression: "idp = :value",
      ExpressionAttributeValues: {
        ":value": idp,
      },
      ProjectionExpression: "#domain,created,createdBy,tenant,verified",
      ExpressionAttributeNames: {
        "#domain": "domain",
      },
    };

    console.log("Query", JSON.stringify(params));

    // fetch all domains from the database that match an idp
    let result = await _db.client.query(params).promise();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: error.statusCode || 501,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Could not fetch the domains for the IdP",
      }),
    };
  }
};

const handler = middy(listDomains)
  .use(jsonHttpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
