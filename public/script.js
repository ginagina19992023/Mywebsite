const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatLog = document.getElementById("chat-log");
const projectsEl = document.getElementById("projects");
const categoriesEl = document.getElementById("categories");
const sphereEl = document.getElementById("media-sphere");

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `msg ${role === "user" ? "msg-user" : "msg-ai"}`;
  row.textContent = `${role === "user" ? "You" : "AI"}: ${text}`;
  chatLog.appendChild(row);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderSphereItems(projects) {
  const cards = [];
  projects.forEach((project) => {
    const img = project.assets.find((asset) => asset.type === "image");
    cards.push({
      title: project.title,
      src: img?.url || null,
      link: `/project/${project.slug}`,
    });
  });

  if (cards.length === 0) {
    for (let i = 0; i < 26; i += 1) {
      cards.push({ title: "Portfolio", src: null, link: "#" });
    }
  }

  sphereEl.innerHTML = "";
  const radius = 180;
  cards.slice(0, 48).forEach((card, i, arr) => {
    const phi = Math.acos(-1 + (2 * i) / arr.length);
    const theta = Math.sqrt(arr.length * Math.PI) * phi;
    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(phi);

    const item = document.createElement("a");
    item.className = "sphere-item";
    item.href = card.link;
    item.style.transform = `translate3d(${x + 175}px, ${y + 175}px, ${z}px)`;
    item.title = card.title;
    item.innerHTML = card.src
      ? `<img src="${card.src}" alt="${card.title}" />`
      : `<span>${card.title}</span>`;
    sphereEl.appendChild(item);
  });
}

async function loadHomepage() {
  const res = await fetch("/api/site-data");
  const data = await res.json();

  document.getElementById("profile-name").textContent = data.profile.name || "Creative Portfolio";
  document.getElementById("profile-tagline").textContent = data.profile.tagline || "";
  document.getElementById("profile-summary").textContent = data.profile.summary || "";
  document.getElementById("profile-intro").textContent = data.profile.intro || "";

  projectsEl.innerHTML = "";
  if (!data.projects.length) {
    projectsEl.innerHTML = `<div class="meta">No projects yet. Open Edit Studio to create your first one.</div>`;
  }
  data.projects.forEach((project) => {
    const card = document.createElement("a");
    card.href = `/project/${project.slug}`;
    card.className = "project-item";
    card.innerHTML = `<strong>${project.title}</strong><div class="meta">${project.category}</div><p>${project.summary}</p>`;
    projectsEl.appendChild(card);
  });

  const categoryCount = {};
  data.projects.forEach((project) => {
    categoryCount[project.category] = (categoryCount[project.category] || 0) + 1;
  });
  categoriesEl.innerHTML = "";
  Object.entries(categoryCount).forEach(([category, count]) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `${category} (${count})`;
    categoriesEl.appendChild(chip);
  });

  renderSphereItems(data.projects);
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  addMessage("user", message);
  chatInput.value = "";
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    addMessage("ai", data.reply);
  } catch (err) {
    addMessage("ai", `Error: ${err.message}`);
  }
});

addMessage("ai", "Hi! Ask me anything about the projects on this site.");
loadHomepage();
