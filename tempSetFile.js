const setFile = () => {
  //overwrites all content in file

  // if no changes, do nothing.
  console.log(readDB() == JSON.stringify(posts));
  console.log(typeof readDB(), typeof JSON.stringify(posts));
  if (readDB() == JSON.stringify(posts)) {
    return;
  } else {
    fs.writeFile(
      "D:/Users/Michael/Documents/automatic-indeed-applier/server/database/all-postings.json",
      JSON.stringify(posts),
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("file written successfully");
        // File written successfully
      }
    );
  }
};

const appendToFile = () => {
  // adds content to the end of the file
  fs.appendFile("/path/to/file.txt", "Content to append", (err) => {
    if (err) {
      console.error(err);
      return;
    }
    // Content appended successfully
  });
};

readDB().then((result) => {
  console.log("result of reading", result);
});
//setFile()
