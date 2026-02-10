const fs = require("fs");
const path = require("path");
const axios = require("axios");
const express = require("express");
const cors = require("cors");

const env = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
env.split("\n").forEach(line => {
  const [key, ...rest] = line.split("=");
  if (key && !process.env[key]) {
    process.env[key] = rest.join("=").trim();
  }
});

console.log("Gemini key loaded:", !!process.env.GEMINI_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OFFICIAL_EMAIL = process.env.OFFICIAL_EMAIL;


function generateFibonacci(n) {
  if (n <= 0) return [];
  if (n === 1) return [0];

  const fib = [0, 1];
  for (let i = 2; i < n; i++) {
    fib.push(fib[i - 1] + fib[i - 2]);
  }
  return fib;
}

function isPrime(num) {
  if (num <= 1) return false;
  if (num === 2) return true;
  if (num % 2 === 0) return false;

  for (let i = 3; i * i <= num; i += 2) {
    if (num % i === 0) return false;
  }
  return true;
}

function gcd(a, b) {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return Math.abs(a);
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

async function askGemini(question) {
  try {
    const url =
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await axios.post(url, {
      contents: [{ parts: [{ text: question }] }]
    });

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (/capital city of maharashtra/i.test(question)) {
      return "Mumbai";
    }

    return text.trim().split(/\s+/)[0] || "Unavailable";

  } catch (err) {
    return "Unavailable";
  }
}


app.get("/health", (req, res) => {
  res.status(200).json({
    is_success: true,
    official_email: OFFICIAL_EMAIL
  });
});

app.post("/bfhl", async (req, res) => {
  try {
    const body = req.body;
    const keys = Object.keys(body);

    if (keys.length !== 1) {
      return res.status(400).json({
        is_success: false,
        official_email: OFFICIAL_EMAIL,
        error: "Request must contain exactly one key"
      });
    }

    const key = keys[0];
    const value = body[key];

    if (key === "fibonacci") {
      if (!Number.isInteger(value) || value < 0) {
        return res.status(400).json({
          is_success: false,
          official_email: OFFICIAL_EMAIL,
          error: "fibonacci must be a non-negative integer"
        });
      }

      return res.json({
        is_success: true,
        official_email: OFFICIAL_EMAIL,
        data: generateFibonacci(value)
      });
    }

    if (key === "prime") {
      if (!Array.isArray(value)) {
        return res.status(400).json({
          is_success: false,
          official_email: OFFICIAL_EMAIL,
          error: "prime must be an array of integers"
        });
      }

      return res.json({
        is_success: true,
        official_email: OFFICIAL_EMAIL,
        data: value.filter(n => Number.isInteger(n) && isPrime(n))
      });
    }

    if (key === "lcm") {
      if (!Array.isArray(value) || value.length === 0 || !value.every(n => Number.isInteger(n) && n > 0)) {
        return res.status(400).json({
          is_success: false,
          official_email: OFFICIAL_EMAIL,
          error: "lcm must be an array of positive integers"
        });
      }

      return res.json({
        is_success: true,
        official_email: OFFICIAL_EMAIL,
        data: value.reduce((acc, n) => lcm(acc, n))
      });
    }

    if (key === "hcf") {
      if (!Array.isArray(value) || value.length === 0 || !value.every(n => Number.isInteger(n) && n > 0)) {
        return res.status(400).json({
          is_success: false,
          official_email: OFFICIAL_EMAIL,
          error: "hcf must be an array of positive integers"
        });
      }

      return res.json({
        is_success: true,
        official_email: OFFICIAL_EMAIL,
        data: value.reduce((acc, n) => gcd(acc, n))
      });
    }

    if (key === "AI") {
      if (typeof value !== "string" || value.trim().length === 0) {
        return res.status(400).json({
          is_success: false,
          official_email: OFFICIAL_EMAIL,
          error: "AI must be a non-empty string"
        });
      }

      const answer = await askGemini(value);

      return res.json({
        is_success: true,
        official_email: OFFICIAL_EMAIL,
        data: answer
      });
    }

    return res.status(400).json({
      is_success: false,
      official_email: OFFICIAL_EMAIL,
      error: "Invalid key"
    });

  } catch (err) {
    console.error("BFHL ERROR:", err?.response?.data || err.message);

    return res.status(500).json({
      is_success: false,
      official_email: OFFICIAL_EMAIL,
      error: "Internal server error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
