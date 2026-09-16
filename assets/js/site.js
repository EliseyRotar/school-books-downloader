document.addEventListener("DOMContentLoaded", () => {
  // mark current nav item
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    const href = (a.getAttribute("href") || "").split("/").pop();
    if (href === here) a.setAttribute("aria-current", "page");
  });

  // external links
  document.querySelectorAll('a[data-ext]').forEach((a) => {
    a.addEventListener("click", () => {
      try {
        localStorage.setItem("folio_go", JSON.stringify({ at: Date.now(), to: a.href }));
      } catch (_) {}
    });
  });
});