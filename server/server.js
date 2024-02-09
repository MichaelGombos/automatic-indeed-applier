const express = require("express");
const fs = require("fs");
const fsPromises = require("fs").promises;
const { Builder, Capabilities, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

const customProfilePath =
  "C:/Users/Michael/AppDataLocal/Google/Chrome/User Data/Profile 2";
const options = new chrome.Options();
options.addArguments(`--user-data-dir=${customProfilePath}`);

const driver = new Builder()
  .forBrowser("chrome")
  .setChromeOptions(options)
  .build();

// ------------------------------------------------ Selenium ------------------------------------------------ //
const openIndeed = () => {
  driver.get("https://indeed.com");
};
let originalWindow;
const switchTabFocus = async () => {
  //Store the ID of the original window
  originalWindow = await driver.getWindowHandle();
  //Loop through until we find a new window handle
  const windows = await driver.getAllWindowHandles();
  windows.forEach(async (handle) => {
    if (handle !== originalWindow) {
      await driver.switchTo().window(handle);
    }
  });
};

const switchToScraperTab = async () => {
  originalWindow = await driver.getWindowHandle();
  const handles = await driver.getAllWindowHandles();
  for (let handle of handles) {
    await driver.switchTo().window(handle);
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes("www.indeed.com/viewjob")) {
      console.log("Switched to the tab with URL: www.indeed.com/viewjob");
      await enableFormScraper();
      return true;
    }
  }
  console.log('scraper tab "www.indeed.com/viewjob" not found.');
  return false;
};

const closeScraperTab = async () => {
  //Close the tab or window
  console.log("before driver close");
  await driver.close();
  console.log("after driver close");
  //Switch back to the old tab or window
  await driver.switchTo().window(originalWindow);
  await disableFormScraper();
};

const simulateRealClick = async (selector) => {
  console.log("simulating a real click");
  //this time should be random in the future.
  await new Promise((resolve) => setTimeout(resolve, 1000));
  try {
    const foundElement = await driver.findElement(By.css(selector));
    if (foundElement) {
      console.log("element found");
      let rn = new Date();
      let time = `${rn.getHours()}:${rn.getMinutes()}:${rn.getSeconds()}:${rn.getMilliseconds()}`;

      await foundElement.click();
      console.log("SERVER: clicked element", selector, time);
    } else {
      console.log("no element found");
    }
  } catch (err) {
    console.log("Error in simulateRealClick: ", err);
    throw err;
  }
};

// ------------------------------------------------ Scraper Database ------------------------------------------------ //

const readScraperState = async () => {
  try {
    const data = await fsPromises.readFile(
      `D:/Users/Michael/Documents/automatic-indeed-applier/server/database/web-scraper-state.json`,
      "utf8"
    );
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading scraper state file`, err);
  }
};

const overwriteScraperState = async (info) => {
  try {
    fsPromises
      .writeFile(
        "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/web-scraper-state.json",
        JSON.stringify(info)
      )
      .then(() => console.log("able to overwrite scraper state"));
  } catch (err) {
    console.error("error overwriting scraper state", err);
  }
  return;
};

const toggleListCrawler = async () => {
  readScraperState().then((data) => {
    data.isListCrawlerEnabled = !data.isListCrawlerEnabled;
    try {
      fsPromises
        .writeFile(
          "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/web-scraper-state.json",
          JSON.stringify(data)
        )
        .then(() =>
          console.log("TOGGLED LIST CRAWLER TO ", data.isListCrawlerEnabled)
        );
    } catch (err) {
      console.error(
        "error while toggling list crawler: problem saving changes to database",
        err
      );
    }
    return;
  });
};

const toggleFormScraper = async () => {
  readScraperState().then((data) => {
    data.isFormScraperEnabled = !data.isFormScraperEnabled;
    try {
      fsPromises
        .writeFile(
          "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/web-scraper-state.json",
          JSON.stringify(data)
        )
        .then(() =>
          console.log("TOGGLED FORM SCRAPER TO ", data.isFormScraperEnabled)
        );
    } catch (err) {
      console.error("error while toggling list crawler", err);
    }
    return;
  });
};

const disableFormScraper = async () => {
  readScraperState().then((data) => {
    data.isFormScraperEnabled = false;
    try {
      fsPromises
        .writeFile(
          "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/web-scraper-state.json",
          JSON.stringify(data)
        )
        .then(() =>
          console.log(
            "(disable) TOGGLED FORM SCRAPER TO ",
            data.isFormScraperEnabled
          )
        );
    } catch (err) {
      console.error("error while toggling list crawler", err);
    }
    return;
  });
};

const enableFormScraper = async () => {
  readScraperState().then((data) => {
    data.isFormScraperEnabled = true;
    try {
      fsPromises
        .writeFile(
          "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/web-scraper-state.json",
          JSON.stringify(data)
        )
        .then(() =>
          console.log(
            "(enable) TOGGLED FORM SCRAPER TO ",
            data.isFormScraperEnabled
          )
        );
    } catch (err) {
      console.error("error while toggling list crawler", err);
    }
    return;
  });
};

const setCrawlerLocation = async (page, postIndex) => {
  readScraperState.then((data) => {
    data.currentPage = page;
    data.currentPostIndex = postIndex;
    try {
      fsPromises
        .writeFile(
          "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/web-scraper-state.json",
          JSON.stringify(data)
        )
        .then(() => console.log("SET CRAWLER LOCATION TO ", page, postIndex));
    } catch (err) {
      console.error("ERROR SETTING CRAWLER LOCATION", err);
    }
    return;
  });
};

// ------------------------------------------------ Posts Database ------------------------------------------------ //

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

// ------------------------------------------------ Routes ------------------------------------------------ //

app.get("/", (request, response) => {
  response.send("<h1>Hello World!</h1>");
});

app.get("/api/scraper", (request, response) => {
  readScraperState().then((scraperState) => {
    response.json(scraperState);
  });
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

app.post("/api/commands/toggle-list-crawler", (request, response) => {
  toggleListCrawler()
    .then(() => {
      console.log("Attempting to toggle list crawler");
      response.status(200).end();
      console.log("did I reach this point?");
    })
    .catch((err) => {
      console.log("error while toggling list crawler", err);
      response.status(400).end();
    });
});

app.post("/api/commands/toggle-form-scraper", (request, response) => {
  toggleFormScraper()
    .then(() => {
      console.log("Attempting to toggle form scraper");
      response.status(200).end();
    })
    .catch((err) => {
      console.log("error while toggling form scraper");
      response.status(400).end();
    });
});

app.post("/api/commands/click", (request, response) => {
  const selector = request.body.selector;
  console.log("Trying to click inside the server", selector);
  driver
    .getCurrentUrl()
    .then((cUrl) => {
      simulateRealClick(selector)
        .then(() => {
          console.log("clicked button", selector, cUrl);
          response.status(200).end();
        })
        .catch((error) => {
          console.log("Error clicking button", cUrl, error);
          response.status(400).end();
        });
    })
    .catch((error) => {
      console.log("error getting URL");
      response.status(400).end();
    });
});

app.post("/api/commands/open-link", (request, response) => {
  const url = request.body.link;
  console.log("Trying to open link inside the server", url);

  driver
    .executeScript("window.open(arguments[0]);", url)
    .then(() => {
      response.status(200).end();
    })
    .catch((error) => {
      console.log("Error clicking link", error);
      response.status(400).end();
    });
});

app.post("/api/commands/switch-tabs", (request, response) => {
  console.log("Trying to switch browser tabs");
  switchToScraperTab()
    .then(() => {
      response.status(200).end();
    })
    .catch((err) => {
      console.log("Error switching tabs", err);
      response.status(400).end();
    });
});

app.post("/api/commands/close-tab", (request, response) => {
  console.log("Trying to switch browser tabs");
  closeScraperTab()
    .then(() => {
      response.status(200).end();
    })
    .catch((err) => {
      console.log("Error closing tab", err);
      response.status(400).end();
    });
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
      console.log("failed PUT: post not found");
      response.status(404).end();
    }
  });
});

app.put("/api/scraper", (request, response) => {
  const post = request.body;
  overwriteScraperState(post)
    .then(() => {
      console.log("attempting to overwrite scraper state");
      response.json(post);
    })
    .catch((err) => {
      console.log("error overwriting scraper state", err);
      response.status(400).end();
    });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
disableFormScraper();
openIndeed();
