import "./App.css";
import axios from "axios";
import React, { useState, useEffect } from "react";

let postExample = {
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
};

const showElementAsPending = (element) => {};

function arrayToCSV(jsonArray) {
  if (jsonArray.length === 0) return "";
  const headers = Object.keys(jsonArray[0]).join(",");
  const rows = jsonArray.map((obj) => {
    return Object.values(obj)
      .map((value) => {
        let stringValue = String(value);
        if (
          stringValue.includes(",") ||
          stringValue.includes("\n") ||
          stringValue.includes('"')
        ) {
          stringValue = `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",");
  });
  return [headers].concat(rows).join("\n");
}

function downloadData(data, fileName) {
  const blob = new Blob([data], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // Clean up by revoking the object URL
}

const handleDownload = (isFiltered) => {
  const fileName = isFiltered
    ? "FilteredJobApplications"
    : "AllJobApplications";

  getPost().then((data) => {
    const tempData = data;
    if (isFiltered) {
      const filteredArray = tempData.filter(
        (item) => item.successful !== false
      );
      downloadData(arrayToCSV(filteredArray), fileName);
    } else {
      downloadData(arrayToCSV(data), fileName);
    }
  });
};

const getPost = async (id) => {
  return axios
    .get(`http://localhost:3001/api/posts${id ? `/${id}` : ""}`)
    .then((response) => {
      return response.data;
    })
    .catch((error) =>
      console.error("DASHBOARD: Error getting post from server", error)
    );
};

const handleGetPost = (id) => {
  console.log(id === null);
  const string = id ? `post with ID ${id}` : " all posts";
  console.log("Getting", string);

  getPost(id).then((data) => console.log("postData", data));
};

const handleAddPost = (post) => {
  console.log("Sending post to database");
  console.log("post information", post);

  axios
    .post(`http://localhost:3001/api/posts`, post)
    .then((response) => console.log("successfull post", response.data))
    .catch((error) =>
      console.error("DASHBOARD: Error adding post to server", error)
    );
};

const handleDeletePost = (id) => {
  console.log("attempting to delete post with ID", id);

  axios
    .post(`http://localhost:3001/api/posts/${id}`)
    .then((response) => console.log("successfull deletion", response.data))
    .catch((error) =>
      console.error("DASHBOARD: Error deleting post from server", error)
    );
};

const handleClearPosts = () => {
  console.log("attempting to clear all posts in the db");

  axios
    .post(`http://localhost:3001/api/commands/clear/`)
    .then((response) =>
      console.log("successfull full clear deletion", response.data)
    )
    .catch((error) =>
      console.error("DASHBOARD: Error clearing all data from server", error)
    );
};

const handleResetPosts = () => {
  console.log("attempting to reset db");

  axios
    .post(`http://localhost:3001/api/commands/reset/`)
    .then((response) => console.log("successfull reset", response.data))
    .catch((error) =>
      console.error("DASHBOARD: Error resetting database", error)
    );
};

const handleToggleListCrawler = (cb) => {
  console.log("attempting to toggle List crawler");

  axios
    .post(`http://localhost:3001/api/commands/toggle-list-crawler/`)
    .then((response) => {
      cb();
      console.log("toggled list crawler", response.data);
    })
    .catch((error) =>
      console.error("DASHBOARD: error toggling list crawler", error)
    );
};

const handleToggleFormScraper = (cb) => {
  console.log("attempting to toggle form scraper");

  axios
    .post(`http://localhost:3001/api/commands/toggle-form-scraper/`)
    .then((response) => {
      cb();
      console.log("toggled form scraper", response.data);
    })
    .catch((error) =>
      console.error("DASHBOARD: error toggling form scraper", error)
    );
};

function App() {
  const [isListCrawlerEnabled, setIsListCrawlerEnabled] = useState(false);
  const [isFormScraperEnabled, setIsFormScraperEnabled] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);

  const setScraperStatus = (data) => {
    setIsListCrawlerEnabled(data.isListCrawlerEnabled);
    setIsFormScraperEnabled(data.isFormScraperEnabled);
    setCurrentPage(data.currentPage);
    setCurrentPostIndex(data.currentPostIndex);
  };
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("Starting data poll");
    const interval = setInterval(() => {
      fetch("http://localhost:3001/api/scraper/")
        .then((response) => response.json())
        .then((data) => {
          setCount((count) => {
            //console.log("polling the server", count);
            return count + 1;
          });
          setScraperStatus(data);
        });
    }, 5000); // Check every 5 seconds

    // Cleanup functionss
    return () => {
      console.log("Clearing interval");
      clearInterval(interval);
    };
  }, []);
  return (
    <div className="App">
      <header className="App-header">
        <h1>Indeed Bot V1:</h1>
        <h2>Status</h2>
        <ul>
          <li>
            List Crawler : {isListCrawlerEnabled ? "Enabled" : "Disabled"}
          </li>
          <li>
            Form Scraper : {isFormScraperEnabled ? "Enabled" : "Disabled"}
          </li>
          <li>
            Current Location : (PAGE {currentPage} , POST {currentPostIndex})
          </li>
          <li>Total posts crawled : </li>
          <li>Total sucessfull posts : </li>
          <li>Server long poll count : {count}</li>
        </ul>
        <p>Test Functions</p>
        <div className="row g-md">
          <button onClick={() => handleGetPost()}>Get Posts</button>
          <button onClick={() => handleGetPost(2)}>Get PostsById (2)</button>
          <button onClick={() => handleAddPost(postExample)}>
            AppendPostsToDB
          </button>
          <button onClick={() => handleDeletePost(3)}>DeletePost (3)</button>
          <button onClick={() => handleClearPosts()}>Delete all posts</button>
          <button onClick={() => handleResetPosts()}>Reset Database</button>
        </div>
        <p>Bot Functions</p>
        <div className="row g-md">
          <button
            onClick={() =>
              handleToggleListCrawler(() =>
                setIsListCrawlerEnabled(!isListCrawlerEnabled)
              )
            }
          >
            {!isListCrawlerEnabled ? "ENABLE" : "DISABLE"} list crawler
          </button>
          <button
            onClick={() =>
              handleToggleFormScraper(() =>
                setIsFormScraperEnabled(!isFormScraperEnabled)
              )
            }
          >
            {!isFormScraperEnabled ? "ENABLE" : "DISABLE"} form scraper
          </button>
          <button onClick={() => handleDownload(false)}>
            Download All Scanned Jobs
          </button>
          <button onClick={() => handleDownload(true)}>
            Download only Applied Jobs
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;
