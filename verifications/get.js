"use strict";

const middy = require("middy");
const { cors, httpErrorHandler } = require("middy/middlewares");
const dynamodb = require("./_dynamodb");

const getVerification = async (event, context, callback) => {
  console.log("domain", event.pathParameters);
  let domain = event.pathParameters.domain;

  try {
    const params = {
      TableName: process.env.VERIFICATIONS_TABLE,
      IndexName: "domains-" + process.env.VERIFICATIONS_TABLE,
      KeyConditionExpression: "#domain = :value",
      ExpressionAttributeNames: {
        "#domain": "domain", // name is a reserved word, should have just used domain :P
        "#updated": "updated",
      },
      ExpressionAttributeValues: {
        ":value": domain,
      },
      ProjectionExpression:
        "idp, tenant, created, #updated, dnsVerificationString, verified",
    };

    // fetch all domains from the database that match an idp
    let result = await dynamodb.query(params).promise();

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
          error: `No verification entry for domain: '${domain}'`,
        }),
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: error.statusCode || 501,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Could not retrieve domain verification details.",
      }),
    };
  }
};

const handler = middy(getVerification)
  .use(httpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };