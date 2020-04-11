"use strict";

const dynamodb = require("./dynamodb");

module.exports.create = (event, context, callback) => {
  const data = JSON.parse(event.body);

  console.log("Got data", event.body);
  if (typeof data.domain !== "string" && typeof data.idp !== "string") {
    console.error("Validation Failed");
    callback(null, {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Could not add the domain for the IdP" }),
    });
    return;
  }

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      name: data.domain,
      idp: data.idp,
      verified: data.verified,
      created: new Date().getTime(),
    },
  };

  // write the todo to the database
  dynamodb.put(params, (error, data) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Could not add the domain for the IdP" }),
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(params.Item),
    };
    callback(null, response);
  });
};
