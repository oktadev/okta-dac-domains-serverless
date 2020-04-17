"use strict";

const dynamodb = require("./_dynamodb");
const middy = require("middy");
const { cors, httpErrorHandler } = require("middy/middlewares");

const removeDomain = async (event) => {
  console.log("domain", event.pathParameters);

  let { domain } = event.pathParameters;

  try {
    const queryParams = {
      TableName: process.env.VERIFICATIONS_TABLE,
      IndexName: "domains-" + process.env.VERIFICATIONS_TABLE,
      KeyConditionExpression: "#domain = :value",
      ExpressionAttributeNames: {
        "#domain": "domain",
      },
      ExpressionAttributeValues: {
        ":value": domain,
      },
      FilterExpression: "attribute_exists(idp)",
      ProjectionExpression: "idp",
    };

    // fetch all domains from the database that match an idp
    let result = await dynamodb.query(queryParams).promise();

    console.log(JSON.stringify(result.Items));

    if (result.Items.length != 1) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `No entry for domain: '${name}'`,
        }),
      };
    }

    let idp = result.Items[0].idp;

    const params = {
      TableName: process.env.VERIFICATIONS_TABLE,
      Key: {
        domain,
        idp,
      },
      ReturnValues: "ALL_OLD",
    };

    console.log("Delete Item", JSON.stringify(params));

    // delete the domain from the database
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
        error: `Could not remove the verification entry. Reason: ${error.code}`,
      }),
    };
  }
};

const handler = middy(removeDomain)
  .use(httpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
