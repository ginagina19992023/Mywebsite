async function loadProject() {
  const slug = window.location.pathname.split("/").pop();
  const res = await fetch(`/api/projects/${slug}`);
  const data = await res.json();
  if (!res.ok) {
    document.getElementById("title").textContent = data.error || "Project not found";
    return;
  }

  const project = data.project;
  document.title = `${project.title} - Project`;
  document.getElementById("title").textContent = project.title;
  document.getElementById("category").textContent = `Category: ${project.category}`;
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

loadProject();
