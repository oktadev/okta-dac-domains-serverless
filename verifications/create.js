"use strict";

const _ = require("lodash");
const _db = require("../_dynamodb");
const uuid = require("uuid4");
const middy = require("middy");
const { cors, jsonBodyParser, validator } = require("middy/middlewares");
const jwtMiddleware = require("../jwtMiddleware");
const jsonHttpErrorHandler = require("../jsonHttpErrorHandler");

const createVerification = async (event) => {
  console.log("createVerification( " + JSON.stringify(event.body) + " )");
  console.log("Context", JSON.stringify(event.requestContext.authorizer));

  console.log("Middleware Okta Info", event.oktaTenant);

  const { domain, tenant, idp } = event.body;
  let { uid } = handler.event.requestContext.authorizer;
  let dnsVerificationString = uuid();
  try {
    const params = {
      TableName: process.env.VERIFICATIONS_TABLE,
      Item: {
        domain,
        idp,
        tenant,
        dnsVerificationString,
        created: new Date().getTime(),
        createdBy: uid,
      },
      ConditionExpression: "attribute_not_exists(#domain)",
      ExpressionAttributeNames: { "#domain": "domain" },
    };

    // write the domain entry to the database
    console.log("Writing to dynamo DB", JSON.stringify(params));

    let result = await _db.client.put(params).promise();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params.Item),
    };
  } catch (error) {
    console.log("error", error);

    return {
      statusCode: error.statusCode || 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: `Could not add the verification for the IdP. Reason: ${error.code}`,
      }),
    };
  }
};

const inputSchema = {
  type: "object",
  properties: {
    body: {
      type: "object",
      properties: {
        domain: { type: "string" },
        tenant: { type: "string" },
        idp: { type: "string" },
      },
      required: ["domain", "tenant", "idp"],
    },
    // JWT Authorizer validation
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

const handler = middy(createVerification)
  .use(jsonBodyParser()) // parses the request body when it's a JSON and converts it to an object
  .use(validator({ inputSchema })) // validates the input
  .use(
    jwtMiddleware({
      idp: "event.body.idp",
      tenant: "event.body.tenant",
    })
  )
  .use(jsonHttpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
