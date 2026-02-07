import { createServer, nextRequest, respond, respondJson, getQuery, parseBody, closeServer, Request, Server } from "../../std/server.js";
const server = await createServer(3000);
console.log("Server listening on port 3000");
while (true) {
  const req = await nextRequest(server);
  console.log(`${req.method} ${req.path}`);
  (await (async function() {
  const __match_14 = ((req.method + " ") + req.path);
  if (__match_14 === "GET /health") {
    return await respond(req, 200, "ok");
  }
   else if (__match_14 === "GET /users") {
    return await respondJson(req, 200, {users: ["alice", "bob", "charlie"]});
  }
   else if (__match_14 === "POST /users") {
    const body = Object.freeze(await parseBody(req));
    return await respondJson(req, 201, {created: true, data: body});
  }
   else if (__match_14 === "GET /search") {
    const q = await getQuery(req, "q");
    return await respondJson(req, 200, {query: q, results: []});
  }
   else if (true) {
    return await respond(req, 404, "not found");
  }
})())
}