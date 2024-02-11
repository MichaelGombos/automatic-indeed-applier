// ==UserScript==
// @name         indeed-application-form scraper
// @namespace    https://github.com/MichaelGombos/automatic-indeed-applier
// @version      1.0.0
// @description  Scrape indeed application forms, then send true easy applies to the database (/question urls)
// @author       Michael Gombos
// @match        https://smartapply.indeed.com*/*
// @exclude      https://smartapply.indeed.com/beta/indeedapply/preloadresumeapply
// @icon
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

/*
modes:

read | select | next | send 
*/

let isValid = false;

const continueButtonSelector = ".ia-BasePage-footer div button";
const resumeButtonSelector = "#resume-display-buttonHeader";
const defaultBuffer = 500; //ms

const wait = async (ms) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
};

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

const sendApplicationToDatabase = (data) => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      url: "http://localhost:3001/api/posts",
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

const switchTab = () => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      url: "http://localhost:3001/api/commands/switch-tabs",
      data: JSON.stringify({ data: "Successfull tab switch" }),
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          console.log("resolving", response);
          resolve();
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

const closeTab = () => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      url: "http://localhost:3001/api/commands/close-tab",
      data: JSON.stringify({ data: "Successfully closed the tab" }),
      onload: function (response) {
        if (response.status >= 200 && response.status < 300) {
          console.log("resolving", response);
          resolve();
        } else {
          reject(
            new Error("unable to close the tab due to status" + response.status)
          );
        }
      },
      onerror: function (error) {
        reject(new Error("Network error occurred", error));
      },
    });
  });
};

function waitForElement(selector, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const intervalTime = 100;
    const startTime = Date.now(); // Record the start time for the timeout check
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      console.log("looking for element", selector);

      const isElementVisible =
        element &&
        (element.offsetWidth > 0 ||
          element.offsetHeight > 0 ||
          element.getClientRects().length > 0);
      const isElementEnabled = element && !element.disabled;
      const isElementInteractable = isElementVisible && isElementEnabled;

      if (isElementInteractable) {
        if (element) {
          console.log("element is ready to interact", selector);
          clearInterval(interval);
          resolve(selector);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          reject(
            new Error(`Element ${selector} not found within ${timeout}ms`)
          );
        }
      }
    }, intervalTime);
  });
}

const waitForAnyElement = (selectors, timeout = 30000) => {
  return Promise.race(
    selectors.map((selector) => waitForElement(selector, timeout))
  );
};

const waitForLocationChange = (currentLocation) => {
  return new Promise((resolve) => {
    const checkLocationChange = () => {
      if (unsafeWindow.location.href !== currentLocation) {
        console.log("detected location change");
        resolve();
      } else {
        console.log("checking for location change again");
        setTimeout(checkLocationChange, 100);
      }
    };

    checkLocationChange();
  });
};

const readForm = () => {};

const selectResume = async () => {
  console.log("waiting for resume to load");
  await wait(1000);
  const resumeSelector = await waitForAnyElement([
    resumeButtonSelector,
    '[data-testid="FileResumeCard-label"]',
  ]);
  await sendClick(resumeSelector);
  await nextForm();
};

const submitApplication = async () => {
  await nextForm(); //we will need to add the captcha solver here too.
};

const nextForm = async () => {
  console.log("clicking next form");
  const savedLocation = unsafeWindow.location.href;
  await sendClick(continueButtonSelector);
  await waitForLocationChange(savedLocation);
  await step();
}; //should call "step" at the end.

const sendPostData = async () => {
  return new Promise((resolve, reject) => {
    getScraperState()
      .then((scraperState) => {
        scraperState.successful = isValid;
        sendApplicationToDatabase(scraperState)
          .then(() => {
            console.log(
              "successfully send application to server isValid:",
              isValid
            );
            resolve();
          })
          .catch((err) => {
            console.log("unable to send application to server", err);
            reject();
          });
      })
      .catch((err) => {
        console.log("unable to get scraperState before posting", err);
      });
  });
};

const step = async () => {
  /*
        If we are not asked for the resume, mark this as a failure and sendPostData()
        If we are asked for the resume, run resumeFormSubmit(), then continue

        If the next page is a question page, mark this as a failure, then send data and close
        If the next page is work-experience, continue

        If the next page is /review, mark this is a success, send data
        */

  //any time you click continue, you should start from the top again
  /*
        Get page location
        IF page location is not resume, work experience, or review, then mark this as a failure
        */

  const path = unsafeWindow.location.pathname;
  console.log("Stepping in current path", path);
  try {
    switch (true) {
      case path.includes("/postresumeapply"):
        console.log("/postresumeapply");
        break;
      case path.includes("/form/resume"):
        await selectResume();
        break;
      case path.includes("work-experience"):
        await nextForm();
        break;
      case path.includes("review"):
        await submitApplication();
        break;
      case path.includes("/post-apply"):
        isValid = true;
        await sendPostData();
        await closeTab();
        break;
      default:
        isValid = false;
        await sendPostData();
        await closeTab();
        break;
    }
  } catch (err) {
    console.log("error in step", path, err);
  }
};

console.log("scraper loaded");
console.log("unsafeWindow.location.href", unsafeWindow.location.href);
if (unsafeWindow.location.href.includes("/indeedapply/")) {
  console.log("TRYING TO MOUNT FORM SCRAPER");
  getScraperState().then((state) => {
    console.log("------------------FORM SCRAPER MOUNTED------------------");
    if (state.isPaused == true) {
      console.log("Scrapers are paused, relaunch in the dashboard");
      return;
    } else {
      console.log("Scraper state ", state);
      if (unsafeWindow.location.href.includes("/postresumeapply")) {
        console.log("running on /postresumeapply");
        waitForLocationChange(unsafeWindow.location.href).then(() => {
          step();
        });
      } else {
        console.log("not running on /postresumeapply");
        step();
      }
    }
  });
}
