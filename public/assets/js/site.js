document.addEventListener("DOMContentLoaded", () => {
  // mark current nav item by resolved URL path (robust inside nested dirs)
  const here = location.pathname;
  document.querySelectorAll(".nav-links a").forEach((a) => {
    try {
      const url = new URL(a.href, location.href);
      if (url.pathname === here) a.setAttribute("aria-current", "page");
    } catch (_) {}
  });
});