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

const sendClick = (selector) => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      headers: {
        "Content-Type": "application/json", // Ensure this line is added
      },
      url: "http://localhost:3001/api/commands/click",
      data: JSON.stringify({ selector: selector }),
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          console.log("we getting a response?", response);
          resolve();
        } else {
          reject(
            new Error("Click Request failed with status " + response.status)
          );
        }
      },
      onerror: function (error) {
        reject(new Error("Network error occurred"));
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

      if (element) {
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
        if (
          slider.children[0].children[1].children[0].children[0].children[0] !==
          undefined
        ) {
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
  iterateList();
};
const iterateList = () => {
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
        sendClick(
          `#mosaic-provider-jobcards > ul > li:nth-child(${
            currentPageListEasyNodeIndexes[easyNodeIndex] + 1
          })`
        );
      } catch (error) {
        console.log("Error with click simulation, continuing iteration");
      }
      console.log("I JUST CLICKED IT AND I'M FINE!");
      setTimeout(() => {
        waitForElement("#indeedApplyButton")
          .then((element) => {
            easyNodeIndex++;
            const date = new Date();
            const postLink = window.location.href;
            const position = document
              .querySelector(".jobsearch-JobInfoHeader-title")
              .innerText.split("\n")[0];
            const employer = document.querySelector(
              'div[data-company-name="true"]'
            ).innerText;
            const address = document
              .querySelector(
                'div[data-testid="inlineHeader-companyLocation"] div'
              )
              .innerText.split("•")[0];
            const wage = document.querySelector("#salaryInfoAndJobType")
              .children[0].innerText;

            const fulltime =
              document.querySelector("#salaryInfoAndJobType").children.length >
              1
                ? document
                    .querySelector("#salaryInfoAndJobType")
                    .children[1].innerText.split("- ")[1] == "Full-time"
                : document.querySelector("#salaryInfoAndJobType").children[0]
                    .innerText == "Full-time";

            postPlaceholder.date = date;
            postPlaceholder.link = postLink;
            postPlaceholder.position = position;
            postPlaceholder.employer = employer;
            postPlaceholder.address = address;
            postPlaceholder.wage = wage;
            postPlaceholder.fulltime = fulltime;
            sendPlaceholderData().then(() => {
              isFormScraperEnabled = true;
              console.log("clicking Apply button");

              try {
                console.log("before click apply");
                // unsafeWindow.simulateEnter(
                //   document.querySelector("#indeedApplyButton")
                // );

                sendClick("#indeedApplyButton");
                console.log("After clicking apply");
              } catch (error) {
                console.log("Error Clicking Apply", error); //if I use weak click for some reason I am getting no error
              }
              console.log("out of try/catch");
            });

            easyNodeIndex++;
            console.log("result from postPlaceholder", postPlaceholder);
          })
          .catch((err) => {
            console.log("ran into an error while waiting for element", err);
          });
      }, 300); //extra 300ms delay to avoid targeting previous post
    }
  }
};

const nextPage = () => {
  console.log("STARTING NEXT PAGE");
  //take note of current location,
  //+1 to current location
  //set mode to readList
  //click the element aria-label="Next Page"
};

// ------------------------------------------------MAIN LOOP------------------------------------------------//

const onSearchPage = window.location.href.includes("/jobs");
console.log("------------------LIST CRAWLER MOUNTED------------------");
console.log("Testing crawler script on searchPage?", onSearchPage);

if (onSearchPage) {
  setInterval(() => {
    //console.log("polling test");

    if (isListCrawlerBusy) {
      //console.log("list crawler is busy, canceling poll");
      return;
    } else {
      getScraperState().then((scraperState) => {
        console.log("poll complete", scraperState);
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
              console.log("Unable to iterate: Scraper is busy");
              break;
            } else {
              iterateList();
              break;
            }
          case "next":
            nextPage();
            break;
        }
      });
    }
  }, 5000);
}
