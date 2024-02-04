const express = require("express");
const app = express();

let posts = [
  {
    id: 1,
    searchTerm: "jet mechanic",
    date: "Sun Feb 01 2024 14:42:20 GMT-0600 (Central Standard Time)",
    link: "https://www.indeed.com/jobs?q=jet+mechanic&l=remote&vjk=60dc7428e99bbd71",
    employer: "Avflight",
    position: "Aircraft Fueler",
    location: "Gunnison, CO 81230",
    wage: "14 - $16 an hour",
    fulltime: true,
    successful: false,
  },
  {
    id: 2,
    searchTerm: "jet mechanic",
    date: "Sat Feb 02 2024 10:02:17 GMT-0600 (Central Standard Time)",
    link: "https://www.indeed.com/jobs?q=jet+mechanic&l=remote&vjk=60dc7428e99bbd71",
    employer: "Sky Aerospace Engineering, Inc.",
    position: "Aircraft Sheetmetal Mechanic",
    wage: "$18 - $40 an hour",
    fulltime: true,
    successful: true,
  },
  {
    id: 3,
    searchTerm: "jet mechanic",
    date: "Sat Feb 03 2024 22:02:17 GMT-0600 (Central Standard Time)",
    link: "https://www.indeed.com/jobs?q=jet+mechanic&l=remote&vjk=60dc7428e99bbd71",
    employer: "Strategic Support Solutions",
    position: "Aircraft Mechanic",
    wage: "$$43 - $45 an hour",
    fulltime: false,
    successful: true,
  },
];

app.get("/", (request, response) => {
  response.send("<h1>Hello World!</h1>");
});

app.get("/api/posts", (request, response) => {
  response.json(posts);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
