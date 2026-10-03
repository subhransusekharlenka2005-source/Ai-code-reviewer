fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    identifier: "manual@example.com",
    password: "password123"
  })
}).then(r => {
  console.log("STATUS:", r.status);
  console.log("HEADERS:", Array.from(r.headers.entries()));
  return r.json();
}).then(console.log).catch(console.error);
