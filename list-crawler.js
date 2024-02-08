// ==UserScript==
// @name         indeed-job-posting-list-crawler
// @namespace    https://github.com/MichaelGombos/automatic-indeed-applier
// @version      1.0.0
// @description  Scroll Indeed postings, Find valid postings, Open link, Await state from express server
// @author       Michael Gombos
// @match        https://www.indeed.com*/*
// @icon
// @grant        GM_xmlhttpRequest
// ==/UserScript==

/*
modes:

setup | read | iterate | next
*/

let isListCrawlerBusy = false;
let isScraperBusy = false;
let mode = "setup";

let currentPageListNodes = [];
let currentPageListEasyNodes = [];
let currentPageListEasyNodeIndexes = [];
let pagePostCount = 0;
let easyNodeIndex = 0;

let postPlaceholder = {
  searchTerm: "Blank",
  searchLocation: "Blank",
  date: "Blank",
  link: "Blank",
  position: "Blank",
  employer: "Blank",
  address: "Blank",
  wage: "Blank",
  fulltime: false,
  successful: false,
};

// ------------------------------------------------API CALLS------------------------------------------------//
const getScraperState = () => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: "http://localhost:3001/api/scraper",
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          resolve(JSON.parse(response.responseText));
        } else {
          reject(new Error("Request failed with status " + response.status));
        }
      },
      onerror: function (error) {
        reject(new Error("Network error occurred"));
      },
    });
  });
};

const setScraperState = (data) => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "PUT",
      headers: {
        "Content-Type": "application/json", // Ensure this line is added
      },
      url: "http://localhost:3001/api/scraper",
      data: JSON.stringify(data),
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          resolve(JSON.parse(response.responseText));
        } else {
          reject(new Error("Request failed with status " + response.status));
        }
      },
      onerror: function (error) {
        reject(new Error("Network error occurred"));
      },
    });
  });
};

const sendPlaceholderData = () => {
  return getScraperState()
    .then((scraperData) => {
      const newScraperState = { ...scraperData, ...postPlaceholder };
      setScraperState(newScraperState)
        .then(() => {
          postPlaceholder = newScraperState;
          console.log("Sent placeholder Data to server");
        })
        .catch((err) => {
          console.log("error setting placeholder data in database", err);
        });
    })
    .catch((err) => {
      console.log("error retriving placeholder state", err);
    });
};

const wait = async (ms) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
};
const sendClick = async (selector) => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      url: "http://localhost:3001/api/commands/click",
      data: JSON.stringify({ selector: selector }),
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          console.log("we getting a response?", response);
          wait(1000).then(resolve());
        } else {
          reject(
            new Error("Click Request failed with status " + response.status)
          );
        }
      },
      onerror: function (error) {
        reject(new Error("Network error occurred", error));
      },
    });
  });
};

const sendOpen = async (url) => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      url: "http://localhost:3001/api/commands/open-link",
      data: JSON.stringify({ link: url }),
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          console.log("we getting a response?", response);
          wait(1000).then(resolve());
        } else {
          reject(
            new Error("Open Link Request failed with status " + response.status)
          );
        }
      },
      onerror: function (error) {
        reject(new Error("Network error occurred", error));
      },
    });
  });
};

const switchTab = () => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Ensure this line is added
      },
      url: "http://localhost:3001/api/commands/switch-tabs",
      data: JSON.stringify({ data: "Successfull tab switch" }),
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          console.log("resolving", response);
          wait(1000).then(resolve());
        } else {
          reject(new Error("tab switch failed with status " + response.status));
        }
      },
      onerror: function (error) {
        reject(new Error(`Network error occurred: ${error.message}`));
      },
    });
  });
};
// ---------------------------------------------FAKE USER ACTIONS--------------------------------------------//

function waitForElement(selector, intervalTime = 100, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now(); // Record the start time for the timeout check
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      console.log("looking for element", selector);
      if (element) {
        console.log("found element");
        clearInterval(interval);
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }
    }, intervalTime);
  });
}

const findElementLocation = (element) => {
  // Get the bounding rectangle of the element
  const rect = element.getBoundingClientRect();

  // Calculate the X and Y coordinates relative to the screen
  const screenX = rect.left + window.scrollX;
  const screenY = rect.top + window.scrollY;

  console.log(
    "element location: X (Screen): " + screenX + ", Y (Screen): " + screenY
  );
  return { x: screenX, y: screenY };
};

const simulateTouch = (element) => {
  // Create a custom touch event
  const { x, y } = findElementLocation(element);
  const touchEvent = new TouchEvent("touchstart", {
    bubbles: true,
    cancelable: true,
    view: unsafeWindow,
    touches: [
      new Touch({
        identifier: Date.now(),
        target: element,
        pageX: x,
        pageY: y,
      }),
    ],
    changedTouches: [
      new Touch({
        identifier: Date.now(),
        target: element,
        pageX: x,
        pageY: y,
      }),
    ],
    targetTouches: [
      new Touch({
        identifier: Date.now(),
        target: element,
        pageX: x,
        pageY: y,
      }),
    ],
  });

  // Dispatch the touch event to the target element
  element.dispatchEvent(touchEvent);
};

unsafeWindow.simulateEnter = (element) => {
  // Focus on the element
  element.focus();
  element.click();
  // Wait for a short pause (e.g., 500 milliseconds)
  setTimeout(function () {
    // Create a keyboard event for the "Enter" key press
    var enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      window: unsafeWindow,
      bubbles: true,
      cancelable: true,
    });

    // Dispatch the "Enter" key press event
    element.dispatchEvent(enterEvent);
    console.log("dispatched enter key.");
  }, 500);
};

function simulateWeakClick(element) {
  if (element) {
    const event = new MouseEvent("click", {
      view: unsafeWindow,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
  }
}

function simulateClick(element) {
  if (element) {
    // Define a temporary event handler that stops propagation
    const stopPropagationHandler = (event) => {
      event.stopPropagation();
      // Remove the event handler immediately after it runs to ensure it only affects this click event
      element.removeEventListener("click", stopPropagationHandler, true);
    };

    // Attach the event handler before dispatching the click event
    element.addEventListener("click", stopPropagationHandler, true); // `true` to capture the event in the capturing phase

    // Create and dispatch the click event
    const event = new MouseEvent("click", {
      view: unsafeWindow,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    console.log("Simulated Click", String(element));
  }
}

const simulateRealClick = (selector) => {};
unsafeWindow.simulateClick = simulateClick;

const removeNonDesktopElements = () => {
  // Select all elements with the class name 'nonJobContent-desktop'
  const elements = document.querySelectorAll(".nonJobContent-desktop");

  // Loop through the selected elements
  elements.forEach((element) => {
    // Get the parent element
    const parent = element.parentElement;

    // Remove the parent element from the DOM, which also removes the child
    if (parent) {
      parent.remove();
    }
  });
};

// ------------------------------------------------MODES------------------------------------------------//

const setup = () => {
  console.log("STARTING SETUP");
  //read search term, read search location, read search keywords
  //save information to web-scraper-state.JSON
  //set mode to readList
  isListCrawlerBusy = true;
  postPlaceholder.searchTerm = document.querySelector("#text-input-what").value;
  postPlaceholder.searchLocation =
    document.querySelector("#text-input-where").value;
  mode = "read";
  console.log("COMPLETED SETUP");
  readList();
};
const readList = () => {
  console.log("STARTING PAGE READ");
  //Find the Child of the element id = .mosaic-provider-jobcards, and convert to nodelist
  //filter this nodelist to only show the easy options.
  //cache this nodelist as currentPageListEasyNodes
  //set the pagePostCount to currentPageListEasyNodes.length
  //set mode to iterateList
  isListCrawlerBusy = true;
  currentPageListNodes = document.querySelectorAll(".slider_item");
  let arraySliders = Array.from(currentPageListNodes);
  let postsOnPage = Array.from(document.querySelectorAll(".slider_item"));

  currentPageListEasyNodes = arraySliders.filter((slider) => {
    try {
      return !(
        slider.children[0].children[1].children[0].children[0].children[0] ==
        undefined
      );
    } catch {
      //error with undefined child element
      return false;
    }
  });

  currentPageListEasyNodeIndexes = postsOnPage.reduce(
    (accumulator, slider, index) => {
      try {
        const easyApplyTag =
          slider.children[0].children[1].children[0].children[0].children[0]
            .children[1].innerText == "Easily apply";
        if (easyApplyTag) {
          accumulator.push(index);
        }
      } catch {
        //error with undefined child element
      }
      return accumulator;
    },
    []
  ); // Initialize accumulator as an empty array
  console.log("-------------- NODE INDEXES", currentPageListEasyNodeIndexes);

  pagePostCount = currentPageListEasyNodeIndexes.length;
  mode = "iterate";

  console.log("COMPLETING PAGE READ");
  removeNonDesktopElements();
  iterateList();
};
const iterateList = async () => {
  console.log("STARTING PAGE ITERATION");
  //For each node in the list
  //check if the FormScraper is busy
  //read information from the job posting
  //save the data to the web-scraper-state.json
  //set isFormScraperEnabled to true
  //goToTheNextEasyNode
  //open the link
  //set formScraperBusy to true
  //TODO if no more EasyNodes, set mode to navigatePage
  if (isScraperBusy) {
    console.log("scraper is busy, canceling list iteration");
    return;
  } else {
    if (easyNodeIndex >= pagePostCount) {
      nextPage();
      return;
    } else {
      try {
        console.log(
          "the valid node list for this page is",
          currentPageListEasyNodeIndexes
        );
        console.log("we are currently working on", easyNodeIndex);
        const jobCardElement = document.querySelector(
          `#mosaic-provider-jobcards > ul > li:nth-child(${
            currentPageListEasyNodeIndexes[easyNodeIndex] + 1
          })`
        );
        const applySelector = `#mosaic-provider-jobcards > ul > li:nth-child(${
          currentPageListEasyNodeIndexes[easyNodeIndex] + 1
        }) a`;
        const applyLink = document.querySelector(applySelector).href;

        console.log("This is the link for the current posting", applyLink);

        console.log("I JUST CLICKED IT AND I'M FINE!");
        waitForElement(applySelector)
          .then(() => {
            const date = new Date();
            const postLink = window.location.href;
            console.log("jobCardElement", jobCardElement);
            console.log("jobCardElement type", typeof jobCardElement);
            console.log(
              "jobCardElement employer",
              jobCardElement.querySelector('span[data-testid="company-name"]')
            );

            console.log(
              "jobCardElement employer",
              jobCardElement.querySelector('div[data-testid="text-location"]')
            );
            const position =
              jobCardElement.querySelector(".jobTitle").innerText;
            const employer = jobCardElement.querySelector(
              'span[data-testid="company-name"]'
            ).innerText;
            const address = jobCardElement.querySelector(
              'div[data-testid="text-location"]'
            ).innerText;
            const wage = jobCardElement.querySelector(
              ".salary-snippet-container"
            )
              ? jobCardElement.querySelector(".salary-snippet-container")
                  .children[0].innerText
              : "unavailible";

            const fulltime = jobCardElement.querySelector(".jobMetaDataGroup ")
              ? jobCardElement
                  .querySelector(".jobMetaDataGroup ")
                  .innerText.includes("Fill-time")
              : "unavailible";

            postPlaceholder.date = date;
            postPlaceholder.link = postLink;
            postPlaceholder.position = position;
            postPlaceholder.employer = employer;
            postPlaceholder.address = address;
            postPlaceholder.wage = wage;
            postPlaceholder.fulltime = fulltime;

            sendPlaceholderData().then(() => {
              console.log("opening job link");

              sendOpen(applyLink)
                .then(() => {
                  switchTab()
                    .then(() => {
                      console.log("opened job link and switched tabs");
                      isScraperBusy = true;
                      isListCrawlerBusy = false;

                      console.log("current index on apply", easyNodeIndex);
                      easyNodeIndex++;
                      console.log(
                        "easy node index increased to",
                        easyNodeIndex
                      );
                    })
                    .catch((err) => {
                      console.log(
                        "Error switching tabs after opening tab",
                        err
                      );
                    });
                })
                .catch((err) => {
                  console.log("error opening tab", err);
                });
            });
            console.log("result from postPlaceholder", postPlaceholder);
          })
          .catch((err) => {
            console.log("ran into an error while waiting for element", err);
          });
      } catch (error) {
        console.log("Error with click simulation, continuing iteration", error);
      }
    }
  }
};

const nextPage = () => {
  // console.log("STARTING NEXT PAGE");
  //take note of current location,
  //+1 to current location
  //set mode to readList
  //click the element aria-label="Next Page"
};

// ------------------------------------------------MAIN LOOP------------------------------------------------//

const pollScraperState = async () => {
  while (onSearchPage) {
    if (isListCrawlerBusy) {
      console.log("List crawler is busy, skipping iteration.");
    } else {
      try {
        const scraperState = await getScraperState();
        isScraperBusy = scraperState.isFormScraperEnabled;

        switch (mode) {
          case "setup":
            setup();
            break;
          case "read":
            readList();
            break;
          case "iterate":
            if (isScraperBusy) {
              console.log(
                "Unable to iterate: Scraper is busy",
                isScraperBusy,
                scraperState
              );
            } else {
              await iterateList();
            }
            break;
          case "next":
            nextPage();
            break;
        }
      } catch (error) {
        console.error("Error during scraper state polling:", error);
      }
    }

    // Wait for 4 seconds before the next iteration
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};

const launchFormScraper = () => {
  wait(1000).then(() => {
    waitForElement("#indeedApplyButton").then(() => {
      sendClick("#indeedApplyButton");
    });
  });
};

const onSearchPage = window.location.href.includes("/jobs");
const onViewPage = window.location.href.includes("/viewjob");
console.log("------------------LIST CRAWLER MOUNTED------------------");
console.log(
  "RUNNING ON VIEW JOB PAGE:",
  onViewPage,
  "RUNNING ON SEARCH PAGE?",
  onSearchPage
);

if (onSearchPage) {
  pollScraperState();
} else if (onViewPage) {
  launchFormScraper();
}
