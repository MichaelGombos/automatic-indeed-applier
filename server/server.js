const express = require("express");
const app = express();

app.use(express.json());

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

app.get("/api/posts/:id", (request, response) => {
  const id = Number(request.params.id);
  const post = posts.find((post) => {
    console.log(post.id, typeof post.id, id, typeof id, post.id === id);
    return post.id === id;
  });

  if (post) {
    response.json(post);
  } else {
    response.status(404).end();
  }
});

app.delete("/api/posts/:id", (request, response) => {
  const id = Number(request.params.id);
  posts = posts.filter((post) => post.id !== id);

  response.status(204).end();
});

const generateId = () => {
  const maxId = posts.length > 0 ? Math.max(...posts.map((n) => n.id)) : 0;
  return maxId + 1;
};

app.post("/api/posts", (request, response) => {
  console.log("DID THE REQUEST COME THROUGH");
  console.log(request.body);

  const post = request.body;
  post.id = generateId();

  posts = posts.concat(post);

  response.json(post);
});

app.delete("/api/posts/:id", (request, response) => {
  const id = Number(request.params.id);
  posts = posts.filter((post) => post.id !== id);

  response.status(204).end();
});

app.put("/api/posts/:id", (request, response) => {
  console.log(request.body);
  const id = Number(request.params.id);
  postIndex = posts.findIndex((p) => p.id === id);

  const post = request.body;
  if (postIndex) {
    post.id = id;
    posts[postIndex] = post;
    response.json(post);
  } else {
    //post using regular app.post request
    console.log("failed PUT: post not found");
    response.status(404).end();
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
