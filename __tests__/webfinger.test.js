"use strict";

// tests for webfinger
// Generated by serverless-jest-plugin

const mod = require("../domains/webfinger");

const jestPlugin = require("serverless-jest-plugin");
const lambdaWrapper = jestPlugin.lambdaWrapper;
const wrapped = lambdaWrapper.wrap(mod, { handler: "handler" });

describe("webfinger", () => {
  beforeAll((done) => {
    //  lambdaWrapper.init(liveFunction); // Run the deployed lambda

    done();
  });

  it("implement tests here", () => {
    process.env.DYNAMODB_TABLE = "okta-domains-dev";
    const event = {
      queryStringParameters: {
        resource: "maneesh@zeesh.org",
      },
    };
    return wrapped.run(event).then((response) => {
      expect(response).toBeDefined();
    });
  });
});
