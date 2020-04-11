"use strict";

const dynamodb = require("./dynamodb");

module.exports.delete = (event, context, callback) => {
  console.log("domain", event.pathParameters);
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      name: event.pathParameters.name,
      idp: event.pathParameters.idp,
    },
  };

  console.log("Delete Item", JSON.stringify(params));

  // delete the todo from the database
  dynamodb.delete(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Could not remove the domain entry" }),
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify({}),
    };
    callback(null, response);
  });
};
