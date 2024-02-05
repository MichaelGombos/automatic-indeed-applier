import "./App.css";
import axios from "axios";

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

const handleGetPost = (id) => {
  console.log(id === null);
  const string = id ? `post with ID ${id}` : " all posts";
  console.log("Getting", string);

  axios
    .get(`http://localhost:3001/api/posts${id ? `/${id}` : ""}`)
    .then((response) => console.log(response.data))
    .catch((error) =>
      console.error("DASHBOARD: Error getting post from server", error)
    );
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
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Indeed Bot V1:</h1>
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
          <button>Start Web Scraper</button>
          <button>Stop Web Scraper</button>
          <button>Download Master File CSV</button>
          <button>Download Success File CSV</button>
        </div>
      </header>
    </div>
  );
}

export default App;
