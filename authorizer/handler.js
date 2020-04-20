`use strict`;

const jexl = require("jexl");
const AuthPolicy = require("aws-auth-policy");
const OktaJwtVerifier = require("@okta/jwt-verifier");

const oktaJwtVerifier = new OktaJwtVerifier({
  issuer: process.env.OKTA_ISSUER,
  clientId: process.env.OKTA_CLIENT_ID,
});

module.exports.auth = (event, context) => {
  const accessTokenString = event.authorizationToken.split(" ")[1];
  // parse the ARN from the incoming event
  var apiOptions = {};
  var tmp = event.methodArn.split(":");
  var apiGatewayArnTmp = tmp[5].split("/");
  var awsAccountId = tmp[4];
  apiOptions.region = tmp[3];
  apiOptions.restApiId = apiGatewayArnTmp[0];
  apiOptions.stage = apiGatewayArnTmp[1];

  console.log("Verifying Access Token", accessTokenString);
  oktaJwtVerifier
    .verifyAccessToken(accessTokenString, process.env.OKTA_AUDIENCE)
    .then((jwt) => {
      console.log("Verified JWT", jwt.claims);
      const policy = new AuthPolicy(jwt.claims.sub, awsAccountId, apiOptions);

      if (jexl.evalSync(`'SUPERUSERS' in groups`, jwt.claims)) {
        // addDomain
        policy.allowMethod(AuthPolicy.HttpVerb.POST, "domains");
        // removeDomain
        policy.allowMethod(AuthPolicy.HttpVerb.DELETE, "domains/*");
      }

      if (jwt.claims) {
        // getDomain
        policy.allowMethod(AuthPolicy.HttpVerb.GET, "domains/*");
        // listDomains
        policy.allowMethod(AuthPolicy.HttpVerb.GET, "domains");
        // createVerification
        policy.allowMethod(AuthPolicy.HttpVerb.POST, "verifications");
        // checkVerification
        policy.allowMethod(AuthPolicy.HttpVerb.PUT, "verifications/*");
        // getVerification
        policy.allowMethod(AuthPolicy.HttpVerb.GET, "verifications/*");
        // deleteVerification
        policy.allowMethod(AuthPolicy.HttpVerb.DELETE, "verifications/*");
        // listVerifications
        policy.allowMethod(AuthPolicy.HttpVerb.GET, "verifications");
      }

      // Set the JWT Claims in the context (after flattening the arrays)
      let builtPolicy = policy.build();
      builtPolicy.context = {};
      for (claim in jwt.claims) {
        let claimValue = jwt.claims[claim];
        if (claimValue instanceof Array) {
          console.log("isArray", claimValue);
          builtPolicy.context[claim] = claimValue.join(", ");
        } else {
          builtPolicy.context[claim] = claimValue;
        }
      }
      console.log("Policy Returned", JSON.stringify(builtPolicy));
      return context.succeed(builtPolicy);
    })
    .catch((err) => {
      // Either Expired or JWT doesnt match the intended audience or clientId
      console.log("error", err);
      //console.warn(err);
      return context.fail("Unauthorized");
    });
};
