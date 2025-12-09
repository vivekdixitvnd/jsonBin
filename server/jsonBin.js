import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const BIN_ID = process.env.BIN_ID;
const ACCESS_KEY = process.env.X_ACCESS_KEY;
const MASTER_KEY = process.env.X_MASTER_KEY;
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const Create_URL = `https://api.jsonbin.io/v3/b`;

export async function getRecord() {
  const res = await fetch(`${BASE_URL}/latest`);
  if (!res.ok) {
    const text = await res.text();
    console.error("Error fetching JSONBin:", text);
    throw new Error("Failed to fetch record from JSONBin");
  }
  const data = await res.json();
  return data.record;
}

export async function updateRecord(newRecord) {
  const res = await fetch(BASE_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": MASTER_KEY,
      "X-Access-Key": ACCESS_KEY,
    },
    body: JSON.stringify(newRecord)
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Error updating JSONBin:", text);
    throw new Error("Failed to update record in JSONBin");
  }

  const data = await res.json();
  return data;
}

// export async function createRecord(newRecord) {
//   const res = await fetch(Create_URL, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "X-Master-Key": MASTER_KEY,
//       "X-Access-Key": ACCESS_KEY,
//     },
//     body: JSON.stringify(newRecord)
//   });
//   if (!res.ok) {
//     const text = await res.text();
//     console.error("Error updating JSONBin:", text);
//     throw new Error("Failed to update record in JSONBin");
//   }

//   const data = await res.json();
//   return data;
// }
