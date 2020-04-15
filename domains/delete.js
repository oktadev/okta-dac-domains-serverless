"use strict";

const dynamodb = require("./_dynamodb");
const middy = require("middy");
const { cors, httpErrorHandler } = require("middy/middlewares");

const removeDomain = async (event) => {
  console.log("domain", event.pathParameters);

  let { name, idp } = event.pathParameters;

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      name,
      idp,
    },
    ConditionExpression: "attribute_exists(#name)",
    ExpressionAttributeNames: {
      "#name": "name",
    },
    ReturnValues: "ALL_OLD",
  };

  console.log("Delete Item", JSON.stringify(params));

  // delete the domain from the database
  try {
    let res = await dynamodb.delete(params).promise();
    console.log("Dynamo db", JSON.stringify(res));
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(res.Attributes),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: error.statusCode || 501,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: `Could not remove the domain entry. Reason: ${error.code}`,
      }),
    };
  }
};

const handler = middy(removeDomain)
  .use(httpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
