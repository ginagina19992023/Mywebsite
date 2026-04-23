const tokenInput = document.getElementById("admin-token");
const saveBtn = document.getElementById("save-profile");
const generateBtn = document.getElementById("generate-project");
const profileStatus = document.getElementById("profile-status");
const generateStatus = document.getElementById("generate-status");

function getToken() {
  return tokenInput.value.trim();
}

function renderPointCloud() {
  const canvas = document.getElementById("point-cloud");
  const ctx = canvas.getContext("2d");
  const dots = [];
  const amount = 70;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  for (let i = 0; i < amount; i += 1) {
    dots.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach((d) => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
      if (d.y < 0 || d.y > canvas.height) d.vy *= -1;
      ctx.fillStyle = "rgba(143,220,255,0.8)";
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  frame();
}

async function loadProfile() {
  const res = await fetch("/api/site-data");
  const data = await res.json();
  document.getElementById("name").value = data.profile.name || "";
  document.getElementById("tagline").value = data.profile.tagline || "";
  document.getElementById("summary").value = data.profile.summary || "";
  document.getElementById("intro").value = data.profile.intro || "";
}

saveBtn.addEventListener("click", async () => {
  const token = getToken();
  if (!token) {
    profileStatus.textContent = "请先输入 ADMIN_TOKEN。";
    return;
  }
  try {
    const res = await fetch("/api/admin/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({
        name: document.getElementById("name").value.trim(),
        tagline: document.getElementById("tagline").value.trim(),
        summary: document.getElementById("summary").value.trim(),
        intro: document.getElementById("intro").value.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "保存失败");
    profileStatus.textContent = "资料保存成功。";
  } catch (err) {
    profileStatus.textContent = `保存失败：${err.message}`;
  }
});

generateBtn.addEventListener("click", async () => {
  const token = getToken();
  if (!token) {
    generateStatus.textContent = "请先输入 ADMIN_TOKEN。";
    return;
  }
  const formData = new FormData();
  formData.append("title", document.getElementById("project-title").value.trim());
  formData.append("contentText", document.getElementById("project-content").value.trim());
  const files = document.getElementById("project-files").files;
  Array.from(files).forEach((file) => formData.append("files", file));

  generateStatus.textContent = "AI 正在整理并生成页面...";
  try {
    const res = await fetch("/api/admin/generate-project", {
      method: "POST",
      headers: { "x-admin-token": token },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "生成失败");
    generateStatus.textContent = `生成成功（${data.mode}）：${data.project.title} / 分类：${data.project.category}`;
  } catch (err) {
    generateStatus.textContent = `生成失败：${err.message}`;
  }
});

renderPointCloud();
loadProfile();
