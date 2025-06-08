// // const fs = require("fs");
// // const csv = require("csv-parser");
// // const stringify = require("json-stable-stringify"); // Ensure this is installed

// // const inputFile = "SNF_COW.csv";
// // const outputFile = "SNF_COW_output.json";

// // const results = [];
// // let headers = [];

// // fs.createReadStream(inputFile)
// //   .pipe(csv())
// //   .on("headers", (hdrs) => {
// //     headers = hdrs;
// //   })
// //   .on("data", (row) => {
// //     results.push(row);
// //   })
// //   .on("end", () => {
// //     const dataMap = new Map();

// //     results.forEach((row) => {
// //       const keyRaw = row[headers[0]];
// //       const key = parseFloat(keyRaw);
// //       if (isNaN(key)) return;

// //       const nested = headers.slice(1).reduce((acc, col) => {
// //         const val = row[col];
// //         if (val && !isNaN(parseFloat(val))) {
// //           acc.push({ [col]: parseFloat(val) });
// //         }
// //         return acc;
// //       }, []);

// //       dataMap.set(key, nested);
// //     });

// //     // Sort the map by numeric keys
// //     const sortedMap = new Map(
// //       [...dataMap.entries()].sort((a, b) => a[0] - b[0])
// //     );

// //     // Convert to object with string keys (but sort keys using json-stable-stringify)
// //     const sortedJson = {};
// //     for (const [numKey, value] of sortedMap) {
// //       sortedJson[numKey.toString()] = value;
// //     }

// //     fs.writeFileSync(outputFile, stringify(sortedJson, { space: 2 }));
// //     console.log(`✅ Sorted JSON saved to ${outputFile}`);
// // //   });

// // const fs = require("fs");
// // const path = require("path");
// // const Papa = require("papaparse");

// // // Paths
// // const inputCsv = path.join(__dirname, "SNF_BUF.csv");
// // const outputJson = path.join(__dirname, "SNF_BUF_converted.json");

// // // Read CSV file
// // const csvText = fs.readFileSync(inputCsv, "utf8");

// // // Parse CSV with headers = false
// // const { data } = Papa.parse(csvText, { header: false, skipEmptyLines: true });

// // // Extract headers
// // const headerRow = data[0].slice(1); // skip the first empty cell

// // const result = {};

// // // For each column in the header
// // headerRow.forEach((columnHeader, colIndex) => {
// //   const colKey = columnHeader.trim();
// //   if (!colKey) return;

// //   const colArray = [];

// //   // Iterate over each data row
// //   for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
// //     const row = data[rowIndex];
// //     const rowKey = row[0].trim(); // first column is row header
// //     const value = parseFloat(row[colIndex + 1]); // +1 to skip first col

// //     if (rowKey && !isNaN(value)) {
// //       colArray.push({ [rowKey]: value });
// //     }
// //   }

// //   result[colKey] = colArray;
// // });

// // // Wrap in array and write JSON
// // fs.writeFileSync(outputJson, JSON.stringify([result], null, 2));
// // console.log("✅ CSV converted to JSON successfully with exact structure.");

// const fs = require("fs");
// const path = require("path");
// const Papa = require("papaparse");

// // Paths
// const inputCsv = path.join(__dirname, "SNF_BUF.csv");
// const outputJson = path.join(__dirname, "SNF_BUF_converted.json");

// // Read CSV
// const csvText = fs.readFileSync(inputCsv, "utf8");
// const { data } = Papa.parse(csvText, { header: false, skipEmptyLines: true });

// // Get headers (column keys)
// const headers = data[0].slice(1); // skip first cell

// // Create a Map to maintain numeric order
// const resultMap = new Map();

// headers.forEach((colHeader, colIdx) => {
//   const colKey = colHeader.trim();
//   if (!colKey) return;

//   const arr = [];

//   for (let i = 1; i < data.length; i++) {
//     const rowKey = data[i][0]?.trim();
//     const val = parseFloat(data[i][colIdx + 1]);

//     if (rowKey && !isNaN(val)) {
//       arr.push({ [rowKey]: val });
//     }
//   }

//   resultMap.set(parseFloat(colKey), { key: colKey, value: arr });
// });

// // Sort top-level keys numerically
// const sortedResult = {};
// [...resultMap.entries()]
//   .sort((a, b) => a[0] - b[0])
//   .forEach(([, { key, value }]) => {
//     // Sort inner rowKeys numerically
//     value.sort(
//       (a, b) => parseFloat(Object.keys(a)[0]) - parseFloat(Object.keys(b)[0])
//     );
//     sortedResult[key] = value;
//   });

// // Write final JSON file
// fs.writeFileSync(outputJson, JSON.stringify([sortedResult], null, 2));
// console.log("✅ JSON created with numerically sorted keys.");

const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

// File paths
const inputCsv = path.join(__dirname, "SNF_BUF.csv");
const outputJson = path.join(__dirname, "SNF_BUF_converted.json");

// Read CSV text
const csvText = fs.readFileSync(inputCsv, "utf8");
const { data } = Papa.parse(csvText, { header: false, skipEmptyLines: true });

// Extract column headers (excluding the first cell which is row headers)
const colHeaders = data[0].slice(1).map((h) => parseFloat(h.trim()));

// Initialize map with numeric keys
const resultMap = new Map();

for (let c = 0; c < colHeaders.length; c++) {
  const colKey = colHeaders[c];
  const colValues = [];

  for (let r = 1; r < data.length; r++) {
    const rowKey = parseFloat(data[r][0]?.trim());
    const value = parseFloat(data[r][c + 1]);

    if (!isNaN(rowKey) && !isNaN(value)) {
      colValues.push({ [rowKey]: value });
    }
  }

  resultMap.set(colKey, colValues);
}

// Sort top-level keys
const sortedTopKeys = [...resultMap.keys()].sort((a, b) => a - b);

// Build final object
const finalObject = {};
for (const colKey of sortedTopKeys) {
  const sortedInner = resultMap
    .get(colKey)
    .sort(
      (a, b) => parseFloat(Object.keys(a)[0]) - parseFloat(Object.keys(b)[0])
    );

  finalObject[colKey] = sortedInner;
}

// Output as array with one object
fs.writeFileSync(outputJson, JSON.stringify([finalObject], null, 2));
console.log("✅ JSON created with numeric keys and sorted correctly.");
