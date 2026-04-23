const tokenInput = document.getElementById("admin-token");
const saveBtn = document.getElementById("save-profile");
const generateBtn = document.getElementById("generate-project");
const profileStatus = document.getElementById("profile-status");
const generateStatus = document.getElementById("generate-status");

function getToken() {
  return tokenInput.value.trim();
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
    profileStatus.textContent = "Please enter ADMIN_TOKEN first.";
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
    if (!res.ok) throw new Error(data.error || "Save failed");
    profileStatus.textContent = "Profile saved.";
  } catch (err) {
    profileStatus.textContent = `Save failed: ${err.message}`;
  }
});

generateBtn.addEventListener("click", async () => {
  const token = getToken();
  if (!token) {
    generateStatus.textContent = "Please enter ADMIN_TOKEN first.";
    return;
  }
  const formData = new FormData();
  formData.append("title", document.getElementById("project-title").value.trim());
  formData.append("contentText", document.getElementById("project-content").value.trim());
  const files = document.getElementById("project-files").files;
  Array.from(files).forEach((file) => formData.append("files", file));

  generateStatus.textContent = "AI is generating your page...";
  try {
    const res = await fetch("/api/admin/generate-project", {
      method: "POST",
      headers: { "x-admin-token": token },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Generation failed");
    generateStatus.textContent = `Done (${data.mode}): ${data.project.title} / ${data.project.category}`;
  } catch (err) {
    generateStatus.textContent = `Generation failed: ${err.message}`;
  }
});

loadProfile();
