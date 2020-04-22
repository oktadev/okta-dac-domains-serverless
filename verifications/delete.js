"use strict";

const _ = require("lodash");
const _db = require("../_dynamodb");
const middy = require("middy");
const { cors } = require("middy/middlewares");
const jwtMiddleware = require("../jwtMiddleware");
const jsonHttpErrorHandler = require("../jsonHttpErrorHandler");

const removeDomain = async (event) => {
  console.log("domain", event.pathParameters);
  console.log("Middleware Okta Info", event.oktaTenants);
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
    let result = await _db.client.query(queryParams).promise();

    console.log(JSON.stringify(result.Items));

    if (result.Items.length != 1) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `No entry for verification: '${domain}'`,
        }),
      };
    }

    let idp = result.Items[0].idp;
    if (
      !_.find(event.oktaTenants, {
        idp,
      })
    ) {
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: `Forbidden - No access to ${domain}` }),
      };
    }

    // delete the domain
    let res = await _db.deleteVerification(idp, domain);

    // delete the verification
    let res2 = await _db.deleteDomain(idp, domain);

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
        error: `Could not remove the verification entry. Reason: ${error.code}`,
      }),
    };
  }
};

const handler = middy(removeDomain)
  .use(jsonHttpErrorHandler()) // handles common http errors and returns proper responses
  .use(jwtMiddleware({}))
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
