"use strict";

const _db = require("../_dynamodb");
const middy = require("middy");
const { cors, httpErrorHandler } = require("middy/middlewares");

const removeDomain = async (event) => {
  console.log("domain", event.pathParameters);

  let { domain } = event.pathParameters;

  try {
    const queryParams = {
      TableName: process.env.DOMAINS_TABLE,
      IndexName: "domains-" + process.env.DOMAINS_TABLE,
      KeyConditionExpression: "#domain = :value",
      ExpressionAttributeNames: {
        "#domain": "domain", // name is a reserved word, should have just used domain :P
      },
      ExpressionAttributeValues: {
        ":value": domain,
      },
      FilterExpression: "attribute_exists(idp)",
      ProjectionExpression: "idp",
    };

    // fetch all domains from the database that match an idp
    let result = await _db.client.query(queryParams).promise();

    console.log(JSON.stringify(result.Items));

    if (result.Items.length != 1) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `No entry for domain: '${domain}'`,
        }),
      };
    }

    let idp = result.Items[0].idp;

    // delete the verification from the database
    let res2 = await _db.deleteVerification(idp, domain);
    // delete the domain from the database
    let res = await _db.deleteDomain(idp, domain);

    console.log("Dynamo db", JSON.stringify(res));
    return {
      statusCode: 204,
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
