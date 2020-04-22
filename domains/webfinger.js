"use strict";

const _db = require("../_dynamodb");
const middy = require("middy");
const { cors } = require("middy/middlewares");
const jsonHttpErrorHandler = require("../jsonHttpErrorHandler");

const webfinger = async (event) => {
  console.log("Query Parameters", event.queryStringParameters);
  let subject = event.queryStringParameters.resource;
  let domain = subject.split("@").pop();

  console.log("Looking up: " + domain);

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
    ProjectionExpression: "idp",
  };

  try {
    let result = await _db.client.query(params).promise();
    console.log("Got result", JSON.stringify(result));
    if (result.Items.length != 1) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `No IdP associated with domain: '${domain}' using email: '${subject}'`,
        }),
      };
    } else {
      // create a response
      let idp = result.Items[0].idp;
      let payload = {
        subject: subject,
        links: [
          {
            rel: "okta:idp",
            href: `/sso/idps/${idp}`,
            titles: {
              und: "MTASamlIdp",
            },
            properties: {
              "okta:idp:metadata": `/api/v1/idps/${idp}/metadata.xml`,
              "okta:idp:type": "SAML2",
              "okta:idp:id": idp,
            },
          },
        ],
      };
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      };
    }
  } catch (error) {
    console.log("error", error);
    return {
      statusCode: error.statusCode || 501,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Could not fetch the domains for the IdP",
      }),
    };
  }
};

const handler = middy(webfinger)
  .use(jsonHttpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
