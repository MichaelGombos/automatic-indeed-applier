// This script will allow us To Launch, Pause, and Close the scraper server and scraper scripts
// we will also receive heartbeats from the server, and if we stop receiving them, then we will automatically restart the server

const express = require("express");
const cors = require("cors");
const app = express();

const lastResponse = "never :(";
const isAutoRestartEnabled = true;
let scraperServerProcess = "";
app.use(cors());
app.use(express.json());
const { exec } = require("child_process");

const launchServer = () => {
  const runCommand = "npm run start"; //starts scraper server
  scraperServerProcess = exec(runCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    if (stderr) {
      console.log(`stderr: ${stderr}`);
    }
  });
};
const pauseServer = async () => {
  await fetch("http://localhost:3001/api/commands/pause", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timestamp: new Date().toISOString() }),
  });
};

const unpauseServer = async () => {
  await fetch("http://localhost:3001/api/commands/pause", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timestamp: new Date().toISOString() }),
  });
};
const closeServer = () => {
  const killCommand = "taskkill /IM chrome.exe /F";

  scraperServerProcess.kill();
  exec(killCommand, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error: ${err}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
};

let responseInterrupted = false;
let lastTime = new Date().toISOString();
let responseCount = 0;

app.get("/controller/last-response", (request, response) => {
  console.log("getting controller response");
  response.json(lastTime);
});

app.post("/controller/last-response", (request, response) => {
  lastTime = request.body.timestamp;
  console.log("posting controller response", lastTime, responseCount++);
  response.json(lastTime);
});

app.post("/controller/commands/pause", (request, response) => {
  try {
    pauseServer().then(() => {
      console.log("paused scraper");
      response.status(200).end();
    });
  } catch {
    console.log("error while pausing");
    response.status(400).end();
  }
  response.json(lastTime);
});

app.post("/controller/commands/unpause", (request, response) => {
  try {
    unpauseServer().then(() => {
      console.log("unpaused scraper");
      response.status(200).end();
    });
  } catch {
    console.log("error while unpausing");
    response.status(400).end();
  }
  response.json(lastTime);
});

app.post("/controller/commands/launch", (request, response) => {
  launchServer();
  response.json(lastTime);
});

app.post("/controller/commands/close", (request, response) => {
  closeServer();
  response.json(lastTime);
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Controller running on port ${PORT}`);
});
