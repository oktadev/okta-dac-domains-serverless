# DAC - Domains API

## Use-case

Test your service locally, without having to deploy it first.

## Setup

Create a JSON file with the environment variables for the target environment (dev, stage, prod):

e.g, for dev create `dev.env.json`

```javascript
{
  "API_KEY": "<OKTA_API_KEY>",
  "ORG": "https://<tenant>.oktapreview.com"
}
```

```bash
npm install
serverless dynamodb install
serverless offline start
serverless dynamodb migrate (this imports schema)
```

## Run service offline

```bash
serverless offline start
```

## Usage

You can create, retrieve, update, or delete todos with the following commands:

### Create a Domain

```bash
curl -X POST -H "Content-Type:application/json" http://localhost:3000/domain --data '{ "domain": "boeing.com", "idp": "idp001" }'
```

Example Result:

```bash
{"domain":"boeing.com","idp":"idp001","created":1479138570824}
```

### List Domains for an Idp

```bash
curl -H "Content-Type:application/json" http://localhost:3000/domains?idp={idp}
```

Example output:

```bash
[{ "domain": "boeing.com", "idp": "idp001","created":1479138570824 }]
```

### Perform a Webfinger

```bash
# Replace the resource with an email address
curl -H "Content-Type:application/json" http://localhost:3000/.well-known/webfinger?resource={email}
```

Example Result:

```bash
{
    "subject": "pankaj@jepessen.com",
    "links": [
        {
            "rel": "okta:idp",
            "href": "/sso/idps/idp001",
            "titles": {
                "und": "MTASamlIdp"
            },
            "properties": {
                "okta:idp:metadata": "/api/v1/idps/idp001/metadata.xml",
                "okta:idp:type": "SAML2",
                "okta:idp:id": "idp001"
            }
        }
    ]
}
```

### Delete a Domain

```bash
# Replace the <id> part with a real id from your todos table
curl -X DELETE -H "Content-Type:application/json" http://localhost:3000/domains/{idp}/{domain}/
```

No output
