"use strict";

const _ = require("lodash");
const _db = require("../_dynamodb");
const axios = require("axios");
const middy = require("middy");
const { cors } = require("middy/middlewares");
const jwtMiddleware = require("../jwtMiddleware");
const jsonHttpErrorHandler = require("../jsonHttpErrorHandler");

const dnsPrefix = process.env.DNS_VERIFY_PREFIX;

const checkVerification = async (event) => {
  console.log("domain", event.pathParameters);
  let domain = event.pathParameters.domain;
  let uid = event.requestContext.authorizer.uid;

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
    let result = await _db.client.query(params).promise();

    if (result.Items.length == 1) {
      let existing = result.Items[0];
      console.log("Got update" + JSON.stringify(existing));
      if (
        !_.find(event.oktaTenants, {
          idp: existing.idp,
        })
      ) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: `Forbidden - No access to ${domain}` }),
        };
      }

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
              createdBy: uid,
            },
            ConditionExpression: "attribute_not_exists(#domain)",
            ExpressionAttributeNames: { "#domain": "domain" },
          };
          console.log(
            "Creating entry in domains table: " + JSON.stringify(params2)
          );

          let result = await _db.client.put(params2).promise();
          console.log("Domains creation status " + JSON.stringify(result));
        }

        var params3 = {
          TableName: process.env.VERIFICATIONS_TABLE,
          Key: {
            domain,
            idp: existing.idp,
          },
          UpdateExpression:
            "SET #verified = :value , #updated = :updated, #updatedBy = :updatedBy",
          ExpressionAttributeNames: {
            "#verified": "verified",
            "#updated": "updated",
            "#updatedBy": "updatedBy",
          },
          ExpressionAttributeValues: {
            ":value": verified,
            ":updated": new Date().getTime(),
            ":updatedBy": uid,
          },
          ReturnValues: "ALL_NEW",
        };

        let result2 = await _db.client.update(params3).promise();
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
  .use(jwtMiddleware({}))
  .use(jsonHttpErrorHandler()) // handles common http errors and returns proper responses
  .use(cors()); // Adds CORS headers to responses

module.exports = { handler };
