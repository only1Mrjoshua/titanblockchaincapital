const revealElements = document.querySelectorAll(".reveal");
const backToTop = document.getElementById("backToTop");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.14,
    rootMargin: "0px 0px -60px 0px",
  }
);

revealElements.forEach((el) => {
  if (!el.classList.contains("is-visible")) {
    revealObserver.observe(el);
  }
});

function handleBackToTop() {
  if (window.scrollY > 500) {
    backToTop.classList.add("show");
  } else {
    backToTop.classList.remove("show");
  }
}

window.addEventListener("scroll", handleBackToTop, { passive: true });
handleBackToTop();

if (backToTop) {
  backToTop.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}