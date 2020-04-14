"use strict";

const dynamodb = require("./_dynamodb");
const middy = require("middy");
const { cors, httpErrorHandler } = require("middy/middlewares");

const webfinger = async (event) => {
  console.log("Query Parameters", event.queryStringParameters);
  let subject = event.queryStringParameters.resource;
  let domain = subject.split("@").pop();

  console.log("Looking up: " + domain);

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    IndexName: "domains-" + process.env.DYNAMODB_TABLE,
    KeyConditionExpression: "#name = :value",
    ExpressionAttributeNames: {
      "#name": "name", // name is a reserved word, should have just used domain :P
    },
    ExpressionAttributeValues: {
      ":value": domain,
    },
    ProjectionExpression: "idp",
  };

  try {
    let result = await dynamodb.query(params).promise();
    console.log("Got result", JSON.stringify(result));
    if (result.Items.length != 1) {
      console.error(error);
      return {
        statusCode: error.statusCode || 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Could not fetch the domains for the IdP",
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
  .use(httpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
