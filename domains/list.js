"use strict";

const dynamodb = require("./dynamodb");

module.exports.list = (event, context, callback) => {
  console.log("Query Parameters", event.queryStringParameters);

  var params = {
    TableName: process.env.DYNAMODB_TABLE,
    IndexName: "idps-" + process.env.DYNAMODB_TABLE,
    KeyConditionExpression: "idp = :value",
    ExpressionAttributeValues: {
      ":value": event.queryStringParameters.idp,
    },
    Select: "ALL_ATTRIBUTES",
  };

  console.log("Query", JSON.stringify(params));

  // fetch all domains from the database that match an idp
  dynamodb.query(params, (error, result) => {
    // handle potential errors
    if (error) {
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
    const response = {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.Items),
    };
    callback(null, response);
  });
};
