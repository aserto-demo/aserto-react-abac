require("dotenv").config();
const express = require("express");
const jwt = require("express-jwt");
const { displayStateMap, jwtAuthz } = require("express-jwt-aserto");
const jwksRsa = require("jwks-rsa");
const cors = require("cors");
const app = express();
// const router = express.Router();
const isNetlify = process.env.REACT_APP_NETLIFY;
// const routerBasePath = isNetlify ? '/.netlify/functions/api-server' : '/';

const { updateUser, getUsers, getUser } = require("./directory");

const authzOptions = {
  authorizerServiceUrl: process.env.AUTHORIZER_SERVICE_URL,
  policyId: process.env.POLICY_ID,
  policyRoot: process.env.POLICY_ROOT,
  authorizerApiKey: process.env.AUTHORIZER_API_KEY,
  tenantId: process.env.TENANT_ID,
};

//Aserto authorizer middleware function
const checkAuthz = jwtAuthz(authzOptions);

let users = []

const checkJwt = jwt({
  // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS endpoint
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.JWKS_URI,
  }),

  // Validate the audience and the issuer
  audience: process.env.AUDIENCE,
  issuer: process.env.ISSUER,
  algorithms: ["RS256"],
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use(cors());
app.use(displayStateMap(authzOptions));


app.post("/api/update/user", async function (req, res) {
  const { email, key, value } = req.body
  const user = users.find(u => u.email === email)
  await updateUser(req, user.id, { key, value })
  const updatedUser = await getUser(user.id)
  res.json({ success: true, user: updatedUser })
})

app.get("/api/projects/red", checkJwt, checkAuthz, async function (req, res) {
  res.json({ secretMessage: `Here is a secret about Project Red!` });
})

app.get("/api/projects/blue", checkJwt, checkAuthz, async function (req, res) {
  res.json({ secretMessage: `Here is a secret about Project Blue!` });
})


app.get("/api/user", async (req, res) => {
  const { email } = req.body
  const user = users.find(u => u.email === email)
  if (user) {
    res.status(200).json(user)
  } else {
    res.status(403).send('something went wrong');
  }
})

// app.use(routerBasePath, router);

// Launch the API Server at localhost:8080
async function main() {
  users = await getUsers()
  app.listen(8080)
}

if (isNetlify) {
  const serverless = require("serverless-http");
  // users = await getUsers()
  exports.handler = serverless(app);
} else {
  main()
}