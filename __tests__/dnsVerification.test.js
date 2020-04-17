const _ = require("lodash");

let txt = `{
  "Status": 0,
  "TC": false,
  "RD": true,
  "RA": true,
  "AD": false,
  "CD": false,
  "Question": [
    {
      "name": "_oktadac.verification.zeesh.org.",
      "type": 16
    }
  ],
  "Answer": [
    {
      "name": "_oktadac.verification.zeesh.org.",
      "type": 16,
      "TTL": 299,
      "data": "\\"954cf70f-4174-482e-b220-dcbad1bd2996\\""
    },
    {
      "name": "_oktadac.verification.zeesh.org.",
      "type": 16,
      "TTL": 299,
      "data": "\\"9398a53e-98bf-4edb-8b63-95ba05c4d512\\""
    }
  ],
  "Comment": "Response from 2606:4700:58::adf5:3bcc."
}
`;

let response = JSON.parse(txt);

console.log("Parsed\n" + JSON.stringify(response));

let dnsVerificationString = "9398a53e-98bf-4edb-8b63-95ba05c4d512";
let found = _.find(response.Answer, { data: `"${dnsVerificationString}"` });

if (found) {
  verified = true;
}

console.log(verified);
