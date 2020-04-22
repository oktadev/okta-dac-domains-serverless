"use strict";

const middy = require("middy");
const { cors, httpErrorHandler } = require("middy/middlewares");
const _db = require("../_dynamodb");

const getDomain = async (event, context, callback) => {
  console.log("domain", event.pathParameters);
  let domain = event.pathParameters.domain;

  try {
    const params = {
      TableName: process.env.DOMAINS_TABLE,
      IndexName: "domains-" + process.env.DOMAINS_TABLE,
      KeyConditionExpression: "#domain = :value",
      ExpressionAttributeNames: {
        "#domain": "domain", // name is a reserved word, should have just used domain :P
      },
      ExpressionAttributeValues: {
        ":value": domain,
      },
      ProjectionExpression: "idp, created, verified",
    };

    // fetch all domains from the database that match an idp
    let result = await _db.client.query(params).promise();

    if (result.Items.length > 0) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.Items),
      };
    } else {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `No entry for domain: '${domain}'`,
        }),
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: error.statusCode || 501,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Could not retrieve domain details.",
      }),
    };
  }
};

const handler = middy(getDomain)
  .use(httpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
