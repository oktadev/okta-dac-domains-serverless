"use strict";

const dynamodb = require("./_dynamodb");
const uuid = require("uuid4");
const middy = require("middy");
const {
  cors,
  jsonBodyParser,
  validator,
  httpErrorHandler,
} = require("middy/middlewares");

const createVerification = async (event) => {
  console.log("createVerification( " + JSON.stringify(event.body) + " )");
  const { domain, idp, tenant } = event.body;
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
      },
      ConditionExpression: "attribute_not_exists(#domain)",
      ExpressionAttributeNames: { "#domain": "domain" },
    };

    // write the domain entry to the database
    console.log("Writing to dynamo DB", JSON.stringify(params));

    let result = await dynamodb.put(params).promise();
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
      required: ["domain", "tenant", "idp"], // Insert here all required event properties
    },
  },
};

const handler = middy(createVerification)
  .use(jsonBodyParser()) // parses the request body when it's a JSON and converts it to an object
  .use(validator({ inputSchema })) // validates the input
  .use(httpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
