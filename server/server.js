const express = require("express");
const fs = require("fs");
const fsPromises = require("fs").promises;

const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.json());

const readDB = async (isTestFile) => {
  try {
    const data = await fsPromises.readFile(
      `D:/Users/Michael/Documents/automatic-indeed-applier/server/database/all-postings${
        isTestFile ? "-test-version" : ""
      }.json`,
      "utf8"
    );
    return JSON.parse(data);
  } catch (err) {
    console.error(
      `Error reading ${isTestFile ? "test database " : ""} file:`,
      err
    );
  }
};

const overwriteDB = async (info) => {
  // overwrites all content in file
  try {
    fsPromises
      .writeFile(
        "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/all-postings.json",
        JSON.stringify(info)
      )
      .then(() => console.log("able to overwrite"));
  } catch (err) {
    console.error("error overwriting DB", err);
  }
  return;
};

const addToDB = (dataToConcat, cb) => {
  // adds content to the end of the file
  readDB().then((data) => {
    const combinedData = data.concat(dataToConcat);
    try {
      fsPromises
        .writeFile(
          "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/all-postings.json",
          JSON.stringify(combinedData)
        )
        .then(() => {
          console.log("able to add data");
        });
    } catch (err) {
      console.error("error adding to database", err);
    }
    if (cb) {
      cb();
    }
    return;
  });
  return;
};

const replacePostInDB = (id, postData, cb) => {
  readDB().then((data) => {
    postIndex = posts.findIndex((p) => p.id === id);

    if (postIndex) {
      postData.id = id;
      data[postIndex] = postData;

      try {
        fsPromises
          .writeFile(
            "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/all-postings.json",
            JSON.stringify(data)
          )
          .then(() => console.log("able to add replace post"));
      } catch (err) {
        console.error(
          "error replacing post in database : unable to write to file",
          err
        );
      }
    } else {
      //post using regular app.post request
      console.log("Unable to repalce post in database: can't find post index");
    }
    if (cb) {
      cb();
    }
  });

  return;
};

const deleteFromDB = (id, cb) => {
  readDB().then((data) => {
    postIndex = data.findIndex((p) => p.id === id);

    if (postIndex) {
      data.splice(postIndex, 1);

      try {
        fsPromises
          .writeFile(
            "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/all-postings.json",
            JSON.stringify(data)
          )
          .then(() => console.log("able to delete from database"));
      } catch (err) {
        console.error("error deleting from database", err);
      }
    } else {
      //post using regular app.post request
      console.log("Unable to delete file from database");
    }
  });
  if (cb) {
    cb();
  }
  return;
};

const clearDB = (cb) => {
  try {
    fsPromises
      .writeFile(
        "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/all-postings.json",
        JSON.stringify([{}])
      )
      .then(() => console.log("Able to clear database"));
  } catch (err) {
    console.error("error clearing database", err);
  }
  if (cb) {
    cb();
  }
};

app.get("/", (request, response) => {
  response.send("<h1>Hello World!</h1>");
});

app.get("/api/posts", (request, response) => {
  readDB().then((posts) => {
    response.json(posts);
  });
});

app.get("/api/posts/:id", (request, response) => {
  const id = Number(request.params.id);
  readDB().then((posts) => {
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
});

app.delete("/api/posts/:id", (request, response) => {
  const id = Number(request.params.id);
  const callback = () => response.status(204).end();
  deleteFromDB(id, callback);
});

const generateId = () => {
  return readDB().then((posts) => {
    const maxId =
      posts.length > 0
        ? Math.max(...posts.map((n) => (n.id >= 0 ? n.id : false)))
        : 0;
    console.log("is everything good here?", maxId, typeof posts, posts.length);
    return maxId + 1;
  });
};

app.post("/api/posts", (request, response) => {
  const post = request.body;
  generateId().then((id) => {
    post.id = id;
    console.log("TEST generated the post id", id, post.id, post);
    const callback = () => response.json(post);
    addToDB(post, callback);
  });
});

app.post("/api/commands/clear", (request, response) => {
  console.log("Attempting to clear the database");
  const callback = () => response.status(204).end();
  clearDB(callback);
});

app.post("/api/commands/reset", (request, response) => {
  readDB(true)
    .then((data) => {
      overwriteDB(data)
        .then(() => {
          response.status(200).end();
        })
        .catch((error) => {
          console.log("error overwriting database from reset command", error);
          response.status(400).end();
        });
    })
    .catch((error) => {
      console.log("error reading test database", error);
    });
  const callback = () => clearDB(callback);
});

app.put("/api/posts/:id", (request, response) => {
  const id = Number(request.params.id);
  readDB().then((posts) => {
    postIndex = posts.findIndex((p) => p.id === id);

    const post = request.body;
    if (postIndex) {
      post.id = id;
      posts[postIndex] = post;
      const callback = () => response.json(post);
      replacePostInDB(id, posts, callback);
    } else {
      //post using regular app.post request
      console.log("failed PUT: post not found");
      response.status(404).end();
    }
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
