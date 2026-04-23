function renderPointCloud() {
  const canvas = document.getElementById("point-cloud");
  const ctx = canvas.getContext("2d");
  const dots = [];
  const amount = 80;

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
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
    });
  }

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dots.forEach((dot) => {
      dot.x += dot.vx;
      dot.y += dot.vy;
      if (dot.x < 0 || dot.x > canvas.width) dot.vx *= -1;
      if (dot.y < 0 || dot.y > canvas.height) dot.vy *= -1;
      ctx.fillStyle = "rgba(143,220,255,0.8)";
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  frame();
}

async function loadProject() {
  const slug = window.location.pathname.split("/").pop();
  const res = await fetch(`/api/projects/${slug}`);
  const data = await res.json();
  if (!res.ok) {
    document.getElementById("title").textContent = data.error || "项目不存在";
    return;
  }

  const project = data.project;
  document.title = `${project.title} - 项目详情`;
  document.getElementById("title").textContent = project.title;
  document.getElementById("category").textContent = `分类：${project.category}`;
  document.getElementById("summary").textContent = project.summary;

  const bodyEl = document.getElementById("body");
  bodyEl.innerHTML = "";
  project.body.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    bodyEl.appendChild(p);
  });

  const assetsEl = document.getElementById("assets");
  assetsEl.innerHTML = "";
  project.assets.forEach((asset) => {
    const card = document.createElement("div");
    card.className = "item";
    if (asset.type === "image") {
      card.innerHTML = `<img src="${asset.url}" alt="${asset.originalName}" /><div class="meta">${asset.originalName}</div>`;
    } else {
      card.innerHTML = `<a href="${asset.url}" target="_blank" rel="noreferrer">${asset.originalName}</a>`;
    }
    assetsEl.appendChild(card);
  });
}

renderPointCloud();
loadProject();
