const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatLog = document.getElementById("chat-log");
const projectsEl = document.getElementById("projects");
const categoriesEl = document.getElementById("categories");

function addMessage(role, text) {
  const row = document.createElement("div");
  row.className = `msg ${role === "user" ? "msg-user" : "msg-ai"}`;
  row.textContent = `${role === "user" ? "你" : "AI"}：${text}`;
  chatLog.appendChild(row);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderPointCloud() {
  const canvas = document.getElementById("point-cloud");
  const ctx = canvas.getContext("2d");
  const points = [];
  const amount = 90;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resize);
  resize();

  for (let i = 0; i < amount; i += 1) {
    points.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.fillStyle = "rgba(143,220,255,0.8)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 130) {
          ctx.strokeStyle = `rgba(143,220,255,${1 - d / 130})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

async function loadHomepage() {
  const res = await fetch("/api/site-data");
  const data = await res.json();
  document.getElementById("profile-name").textContent = data.profile.name;
  document.getElementById("profile-tagline").textContent = data.profile.tagline;
  document.getElementById("profile-summary").textContent = data.profile.summary;
  document.getElementById("profile-intro").textContent = data.profile.intro;

  projectsEl.innerHTML = "";
  if (!data.projects.length) {
    projectsEl.textContent = "暂时还没有项目，请到 admin 生成。";
  }
  data.projects.forEach((project) => {
    const card = document.createElement("a");
    card.href = `/project/${project.slug}`;
    card.className = "item";
    card.innerHTML = `<strong>${project.title}</strong><div class="meta">${project.category}</div><p>${project.summary}</p>`;
    projectsEl.appendChild(card);
  });

  const categoryCount = {};
  data.projects.forEach((project) => {
    categoryCount[project.category] = (categoryCount[project.category] || 0) + 1;
  });
  categoriesEl.innerHTML = "";
  Object.keys(categoryCount).forEach((category) => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<strong>${category}</strong><div class="meta">${categoryCount[category]} 项</div>`;
    categoriesEl.appendChild(item);
  });
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
    if (!res.ok) throw new Error(data.error || "请求失败");
    addMessage("ai", data.reply);
  } catch (err) {
    addMessage("ai", `错误：${err.message}`);
  }
});

addMessage("ai", "你好，我可以帮你检索这个网站里的项目内容。");
renderPointCloud();
loadHomepage();
