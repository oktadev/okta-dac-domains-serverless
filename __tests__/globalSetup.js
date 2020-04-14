require("dotenv").config();

const aws = require("aws-sdk");
const localDynamo = require("local-dynamo");

//const { TABLES_PARAMS } = require("../../constants/db");

module.exports = () => {
  localDynamo.launch(null, 3000);
  const dynamodb = new aws.DynamoDB();

  return Promise.all(
    ["okta-domains-test"].map((params) =>
      dynamodb
        .createTable(params)
        .promise()
        .catch((err) =>
          console.error(
            "Unable to create table: ",
            JSON.stringify(err, null, 2)
          )
        )
        .then(
          (data) =>
            data &&
            console.log("Database created: ", JSON.stringify(data, null, 2))
        )
    )
  );
};
