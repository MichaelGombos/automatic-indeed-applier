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

let lastTime = new Date().toISOString();
let responseCount = 0;

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

  killSeverOnPort(3001);
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

const killSeverOnPort = (port) => {
  const findProcessCommand = `netstat -aon | findstr :${port}`;

  exec(findProcessCommand, (err, stdout, stderr) => {
    if (err) {
      console.error(`exec error: ${err}`);
      return;
    }

    if (!stdout) {
      console.log(`No process found listening on port ${port}`);
      return;
    }

    const lines = stdout.trim().split("\n");
    lines.forEach((line) => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];

      exec(`taskkill /PID ${pid} /F`, (killErr, killStdout, killStderr) => {
        if (killErr) {
          console.error(`kill error: ${killErr}`);
          return;
        }
        console.log(`Killed process ${pid} listening on port ${port}`);
      });
    });
  });
};

const checkLastTime = () => {
  const currentTime = Date.now();
  const fiveMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
  const lastTimeMS = new Date(lastTime);
  if (currentTime - lastTimeMS > fiveMinutes) {
    console.log(
      "More than 5 minutes have passed since the last POST request, restarting scraper."
    );
    closeServer();
    launchServer();
    lastTime = new Date().toISOString();
  } else {
    console.log(
      `It has been ${((currentTime - lastTimeMS) / 1000).toFixed(
        2
      )} seconds since the last POST request`
    );
  }
};

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
});

app.post("/controller/commands/launch", (request, response) => {
  try {
    launchServer();
    response.status(200).end();
  } catch {
    console.log("error launching server");
    response.status(400).end();
  }
});

app.post("/controller/commands/close", (request, response) => {
  try {
    closeServer();
    response.status(200).end();
  } catch {
    console.log("error closing server");
    response.status(400).end();
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Controller running on port ${PORT}`);
});

setInterval(checkLastTime, 5000);
//check for last time an application was sent, every 5sec.
