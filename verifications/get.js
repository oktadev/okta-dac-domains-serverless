"use strict";

const _ = require("lodash");
const _db = require("../_dynamodb");
const middy = require("middy");
const { cors, validator } = require("middy/middlewares");
const jwtMiddleware = require("../jwtMiddleware");
const jsonHttpErrorHandler = require("../jsonHttpErrorHandler");

const getVerification = async (event, context, callback) => {
  console.log("domain", event.pathParameters);
  let domain = event.pathParameters.domain;
  let { uid } = event.requestContext.authorizer;

  console.log("Middleware Okta Info", event.oktaTenants);
  console.log("User Id", uid);

  try {
    const params = {
      TableName: process.env.VERIFICATIONS_TABLE,
      IndexName: "domains-" + process.env.VERIFICATIONS_TABLE,
      KeyConditionExpression: "#domain = :domain",
      ExpressionAttributeNames: {
        "#domain": "domain",
        "#updated": "updated",
      },
      ExpressionAttributeValues: {
        ":domain": domain,
      },
      ProjectionExpression:
        "idp, tenant, created, #updated, dnsVerificationString, verified",
    };

    // fetch all domains from the database that match an idp
    let result = await _db.client.query(params).promise();

    if (result.Items.length == 1) {
      // Check if idp and matches
      if (
        _.find(event.oktaTenants, {
          idp: result.Items[0].idp,
        })
      ) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.Items),
        };
      } else {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: `Forbidden - No access to ${domain}` }),
        };
      }
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

const inputSchema = {
  type: "object",
  properties: {
    requestContext: {
      type: "object",
      properties: {
        authorizer: {
          type: "object",
          properties: {
            tenants: { type: "string" },
          },
          required: ["tenants"],
        },
      },
      required: ["authorizer"], // Insert here all required event properties
    },
  },
};

const handler = middy(getVerification)
  .use(jsonHttpErrorHandler()) // handles common http errors and returns proper responses
  .use(validator({ inputSchema })) // validates the input
  .use(jwtMiddleware({}))
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
