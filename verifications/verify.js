"use strict";

const _ = require("lodash");
const dynamodb = require("./_dynamodb");
const axios = require("axios");
const middy = require("middy");
const { cors, httpErrorHandler } = require("middy/middlewares");

const dnsPrefix = process.env.DNS_VERIFY_PREFIX;

const checkVerification = async (event) => {
  console.log("domain", event.pathParameters);
  let domain = event.pathParameters.domain;

  let verified = false;

  try {
    const params = {
      TableName: process.env.VERIFICATIONS_TABLE,
      IndexName: "domains-" + process.env.VERIFICATIONS_TABLE,
      KeyConditionExpression: "#domain = :value",
      ExpressionAttributeNames: {
        "#domain": "domain", // domain is a reserved word
      },
      ExpressionAttributeValues: {
        ":value": domain,
      },
      ProjectionExpression:
        "idp, tenant, created, verified, dnsVerificationString",
    };

    // fetch all domains from the database that match an idp
    let result = await dynamodb.query(params).promise();

    if (result.Items.length > 0) {
      console.log("Got update" + JSON.stringify(result.Items));
      let existing = result.Items[0];

      if (!existing.verified) {
        let dnsLookup = await axios.get(
          `https://dns.google/resolve?name=${dnsPrefix}.${domain}&type=16`
        );

        console.log("DNS Lookup", JSON.stringify(dnsLookup.data));

        if (dnsLookup.data.Answer) {
          let entry = _.find(dnsLookup.data.Answer, {
            data: `"${existing.dnsVerificationString}"`,
          });
          if (entry) {
            verified = true;
          }
        }

        /*let responseData = dnsLookup.data.Answer[0].data;
        console.log("data", responseData);
        console.log("dbVerification", existing.dnsVerificationString);
        verified = responseData === '"' + existing.dnsVerificationString + '"';*/
        console.log("DNS verification result", verified);

        if (verified) {
          console.log("Creating entry in domains table: ");
          const params2 = {
            TableName: process.env.DOMAINS_TABLE,
            Item: {
              domain,
              idp: existing.idp,
              tenant: existing.tenant,
              verified: true,
              created: new Date().getTime(),
            },
            ConditionExpression: "attribute_not_exists(#domain)",
            ExpressionAttributeNames: { "#domain": "domain" },
          };
          console.log(
            "Creating entry in domains table: " + JSON.stringify(params2)
          );

          let result = await dynamodb.put(params2).promise();
          console.log("Domains creation status " + JSON.stringify(result));
        }

        var params3 = {
          TableName: process.env.VERIFICATIONS_TABLE,
          Key: {
            domain,
            idp: existing.idp,
          },
          UpdateExpression: "SET #verified = :value , #updated = :updated",
          ExpressionAttributeNames: {
            "#verified": "verified",
            "#updated": "updated",
          },
          ExpressionAttributeValues: {
            ":value": verified,
            ":updated": new Date().getTime(),
          },
          ReturnValues: "ALL_NEW",
        };

        let result2 = await dynamodb.update(params3).promise();
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(result2.Attributes),
        };
      } else {
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(existing),
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
        error: "Could not retrieve verification details.",
      }),
    };
  }
};

const handler = middy(checkVerification)
  .use(httpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
