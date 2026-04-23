const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, "uploads");
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "site-data.json");
const adminToken = process.env.ADMIN_TOKEN || "changeme";

for (const dir of [uploadDir, dataDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

if (!fs.existsSync(dataFile)) {
  const initialData = {
    profile: {
      name: "Gina",
      tagline: "AI Builder & Creative Developer",
      summary: "I build AI products, interactive websites, and data-driven experiences.",
      intro:
        "Welcome to my personal website. Here you can explore projects, images, and documents generated with AI-assisted workflows.",
    },
    projects: [],
  };
  fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2), "utf8");
}

function readSiteData() {
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

function writeSiteData(nextData) {
  fs.writeFileSync(dataFile, JSON.stringify(nextData, null, 2), "utf8");
}

function summarizeSiteData(siteData) {
  return siteData.projects
    .map((project) => {
      const images = project.assets.filter((asset) => asset.type === "image").length;
      const files = project.assets.filter((asset) => asset.type === "file").length;
      return `Project: ${project.title}
Category: ${project.category}
Summary: ${project.summary}
Text blocks: ${project.body.length}
Images: ${images}, Files: ${files}`;
    })
    .join("\n\n");
}

function createSlug(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

function classifyAsset(file) {
  return file.mimetype.startsWith("image/") ? "image" : "file";
}

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token !== adminToken) {
    return res.status(401).json({ error: "Invalid admin token." });
  }
  return next();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

app.use(express.json({ limit: "3mb" }));
app.use("/uploads", express.static(uploadDir));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  const usingDefaultAdminToken = !process.env.ADMIN_TOKEN;
  res.json({
    ok: true,
    runtime: "node",
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    hasAdminTokenConfigured: Boolean(process.env.ADMIN_TOKEN),
    usingDefaultAdminToken,
    effectiveAdminTokenHint: usingDefaultAdminToken ? "changeme" : "configured in .env",
  });
});

app.get("/api/site-data", (req, res) => {
  const siteData = readSiteData();
  res.json(siteData);
});

app.get("/api/projects", (req, res) => {
  const siteData = readSiteData();
  res.json({ projects: siteData.projects });
});

app.get("/api/projects/:slug", (req, res) => {
  const siteData = readSiteData();
  const project = siteData.projects.find((item) => item.slug === req.params.slug);
  if (!project) return res.status(404).json({ error: "Project not found." });
  return res.json({ project });
});

app.post("/api/admin/profile", requireAdmin, (req, res) => {
  const siteData = readSiteData();
  const { name, tagline, summary, intro } = req.body || {};
  siteData.profile = {
    name: name || siteData.profile.name,
    tagline: tagline || siteData.profile.tagline,
    summary: summary || siteData.profile.summary,
    intro: intro || siteData.profile.intro,
  };
  writeSiteData(siteData);
  return res.json({ message: "Profile updated.", profile: siteData.profile });
});

async function generateProjectByAI(payload) {
  const apiKey = process.env.OPENAI_API_KEY;
  const fallbackCategory = "General";
  const fallback = {
    title: payload.title || "Untitled Project",
    category: fallbackCategory,
    summary: payload.summaryText.slice(0, 180) || "Generated from uploaded content.",
    body: [payload.summaryText || "No detail provided."],
  };

  if (!apiKey) return { result: fallback, mode: "fallback" };

  const prompt = `You are a project page generator.
Input text:
${payload.summaryText}

Uploaded files:
${payload.fileNames.join(", ") || "none"}

Return JSON only:
{
  "title": "string",
  "category": "string",
  "summary": "string",
  "body": ["paragraph1", "paragraph2"]
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    return { result: fallback, mode: "fallback" };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return { result: fallback, mode: "fallback" };

  try {
    const parsed = JSON.parse(content);
    return {
      result: {
        title: parsed.title || fallback.title,
        category: parsed.category || fallback.category,
        summary: parsed.summary || fallback.summary,
        body: Array.isArray(parsed.body) && parsed.body.length > 0 ? parsed.body : fallback.body,
      },
      mode: "openai",
    };
  } catch (err) {
    return { result: fallback, mode: "fallback" };
  }
}

app.post("/api/admin/generate-project", requireAdmin, upload.array("files", 20), async (req, res) => {
  const siteData = readSiteData();
  const contentText = (req.body.contentText || "").trim();
  const manualTitle = (req.body.title || "").trim();
  const fileEntries = (req.files || []).map((file) => ({
    name: file.filename,
    originalName: file.originalname,
    url: `/uploads/${file.filename}`,
    type: classifyAsset(file),
  }));

  if (!contentText && fileEntries.length === 0) {
    return res.status(400).json({ error: "Please provide text or upload files." });
  }

  const ai = await generateProjectByAI({
    title: manualTitle,
    summaryText: contentText || `Files: ${fileEntries.map((item) => item.originalName).join(", ")}`,
    fileNames: fileEntries.map((item) => item.originalName),
  });

  const title = ai.result.title || manualTitle || `Project ${siteData.projects.length + 1}`;
  const project = {
    id: Date.now().toString(),
    slug: createSlug(`${title}-${Date.now().toString().slice(-4)}`),
    title,
    category: ai.result.category || "General",
    summary: ai.result.summary || "",
    body: ai.result.body || [],
    assets: fileEntries,
    createdAt: new Date().toISOString(),
  };

  siteData.projects.unshift(project);
  writeSiteData(siteData);

  return res.json({
    message: "Project page generated.",
    mode: ai.mode,
    project,
  });
});

app.post("/api/chat", async (req, res) => {
  const message = req.body?.message;
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required." });
  }

  const siteData = readSiteData();
  const context = [
    `Owner: ${siteData.profile.name}`,
    `Tagline: ${siteData.profile.tagline}`,
    `Summary: ${siteData.profile.summary}`,
    `Intro: ${siteData.profile.intro}`,
    `Project count: ${siteData.projects.length}`,
    summarizeSiteData(siteData),
  ].join("\n\n");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const fallback = `This website currently has ${siteData.projects.length} projects. You asked: "${message}". Add OPENAI_API_KEY for richer answers.`;
    return res.json({ reply: fallback, mode: "fallback" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a website assistant. Answer from provided website data only. If unknown, say the website does not include it.",
          },
          { role: "system", content: context },
          { role: "user", content: message },
        ],
        temperature: 0.25,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(500).json({ error: `AI API failed: ${detail}` });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "AI cannot answer right now.";
    return res.json({ reply, mode: "openai" });
  } catch (err) {
    return res.status(500).json({ error: `AI request error: ${err.message}` });
  }
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/project/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "project.html"));
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
