const _ = require("lodash");
const createError = require("http-errors");

const jwtMiddleware = (searchConfig) => {
  return {
    before: (handler, next) => {
      //console.log("handler", handler);
      let { tenants } = handler.event.requestContext.authorizer;

      let _tenants = _.map(tenants.split(", "), (str) => {
        return {
          idp: str.split(":")[0],
          tenant: str.split(":")[1],
        };
      });
      console.log(_tenants);

      let _tenant = _.find(_tenants, searchConfig[0]);

      if (!_tenant) {
        const error = new createError.Unauthorized(
          `Unauthorized. IdP '${searchConfig.idp}' and/or tenant '${searchConfig.tenant}' didnt match JWT claim`
        );
        throw error;
      } else {
        handler.event.oktaTenant = _tenant;
        handler.event.oktaTenants = _tenants;
        next();
      }
    },
    after: (handler, next) => {
      //console.log("handler", handler);
      next();
    },
  };
};

module.exports = jwtMiddleware;
