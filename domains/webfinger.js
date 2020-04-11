"use strict";

const dynamodb = require("./dynamodb");

module.exports.webfinger = (event, context, callback) => {
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
  dynamodb.query(params, (error, result) => {
    // handle potential errors
    if (error || result.Items.length != 1) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Could not fetch the domains for the IdP",
        }),
      });
      return;
    }

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
    const response = {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
    callback(null, response);
  });
};
