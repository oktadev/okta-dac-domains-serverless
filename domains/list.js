"use strict";

const middy = require("middy");
const { cors, httpErrorHandler } = require("middy/middlewares");
const dynamodb = require("./_dynamodb");

const listDomains = async (event, context, callback) => {
  console.log("Query Parameters", event.queryStringParameters);
  let idp = event.queryStringParameters.idp;

  try {
    var params = {
      TableName: process.env.DYNAMODB_TABLE,
      IndexName: "idps-" + process.env.DYNAMODB_TABLE,
      KeyConditionExpression: "idp = :value",
      ExpressionAttributeValues: {
        ":value": idp,
      },
      ProjectionExpression: "#name,created,verified",
      ExpressionAttributeNames: {
        "#name": "name", // name is a reserved word, should have just used domain :P
      },
    };

    console.log("Query", JSON.stringify(params));

    // fetch all domains from the database that match an idp
    let result = await dynamodb.query(params).promise();

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
  .use(httpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
