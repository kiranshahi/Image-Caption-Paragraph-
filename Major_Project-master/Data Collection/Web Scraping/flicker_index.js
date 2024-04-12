const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
let folder;
let delay = 5; // Initial delay in milliseconds between requests
let retryAttempts = 0; // Number of retry attempts for a specific URL
let count = 0;

if (process.argv[2]) {
  folder = process.argv[2];
  folder = path.resolve(__dirname, "../DataSets", folder);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }
  downlaodFromFile();
} else {
  console.log("Please provide valid command");
  console.log("npm start file/link foldername");
}

function downlaodFromFile() {
  fs.readFile("index.txt", "utf8", function (err, data) {
    if (err) throw err.message;
    startDownloading(data).then((values) => {
      return values;
    });
  });
}

function delayRequest(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
async function startDownloading(data) {
  const $ = cheerio.load(data);
  const imgElements = $("img[src]");

  const imgUrls = imgElements
    .map((index, element) => {
      const link = $(element).attr("src");
      // Reset the retry attempts for each new URL
      return extractUrl(link);
    })
    .get();
  console.log(imgUrls.length);
  // Extract valid URLs from the file contents
  fs.writeFileSync("flickerUrl.txt", imgUrls.join("\n"), "utf8");
  for (const url of imgUrls) {
    const destination = Math.random().toString(10).substring(7) + ".jpg";
    retryAttempts = 0; // Reset the retry attempts for each new URL
    delay = 5
    await downloadImage(url, `${folder}/${destination}`);
  }
}

const extractUrl = (url) => {
  return url.replace(/(_[a-zA-Z]+)(\.[a-zA-Z]+)$/, "_z$2");
};

async function downloadImage(url, destination) {
  console.log(url);
  await delayRequest(delay);
  try {
    const response = await axios({
      method: "GET",
      url: url,
      timeout: 86400000,
      maxContentLength: Infinity,
      responseType: "arraybuffer",
    });
    if (response.status === 200) {
      const filePath = path.resolve(__dirname, destination);
      fs.writeFile(filePath, response.data, (err) => {
        if (err) {
          console.error("Error saving the image:", err);
        } else {
          console.log(`Image ${count++} downloaded successfully!`);
        }
      });
    } else if (response.status === 429) {
      console.log("Retrying..");
      if (retryAttempts < 3) {
        // Implement exponential backoff by doubling the delay duration
        delay *= 2;
        retryAttempts++;
        console.log(
          `Received 429 status. Retrying in ${delay} milliseconds...`
        );
        await downloadImage(url, destination); 
      } else {
        console.error("Exceeded maximum retry attempts for the URL:", url);
      }
    } else {
      console.error(
        "Failed to download the image. Status code:",
        response.status
      );
    }
  } catch (error) {
    console.error("Error downloading the image:", error.message);
  }
}