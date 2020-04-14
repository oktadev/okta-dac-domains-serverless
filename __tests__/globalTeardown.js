const aws = require("aws-sdk");
const { TABLES_PARAMS } = require("../../constants/db");

module.exports = (silent = true) => {
  const dynamodb = new aws.DynamoDB();

  return Promise.all(
    TABLES_PARAMS.map(({ TableName }) =>
      dynamodb
        .deleteTable({ TableName })
        .promise()
        .catch(
          (err) =>
            !silent &&
            console.error("Delete fail: ", JSON.stringify(err, null, 2))
        )
        .then(
          (data) =>
            !silent &&
            data &&
            console.log("Deleted table: ", JSON.stringify(data, null, 2))
        )
    )
  );
};
