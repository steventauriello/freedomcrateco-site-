// Simple data for testing – add more eras later
const ammoTimelineData = {
  "ancient-rome": {
    title: "Ancient Rome — Weapon Supply Chests",
    years: "100 BC – 400 AD",
    img: "/assets/img/history/ancient-rome-placeholder.jpg", // adjust path to your images
    alt: "Reconstruction of a Roman wooden campaign chest",
    body: `
      Before gunpowder, Roman legions transported pila heads, sling bullets,
      and ballista bolts in heavy wooden chests reinforced with iron bands.
      These chests are the ancestors of modern ammo crates.
    `
  },
  "freedom-crate-co": {
    title: "Freedom Crate Co. — Modern Heritage Ammo Crates",
    years: "Present Day",
    img: "/assets/img/history/freedom-crate-placeholder.jpg", // adjust path
    alt: "Freedom Crate Co. handcrafted wooden ammo crate",
    body: `
      Freedom Crate Co. builds modern wooden ammo boxes inspired by
      classic military crates – solid pine, steel hardware, OD green coatings,
      and stenciling that pays tribute to WWII and Vietnam era designs.
    `
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const trackWrapper = document.querySelector(".timeline-track-wrapper");
  const leftArrow = document.querySelector(".timeline-arrow-left");
  const rightArrow = document.querySelector(".timeline-arrow-right");

  const items = document.querySelectorAll(".timeline-item");
  const imgEl = document.getElementById("timelineImage");
  const titleEl = document.getElementById("timelineTitle");
  const yearsEl = document.getElementById("timelineYears");
  const bodyEl = document.getElementById("timelineBody");

  // Guard: only run on pages that actually have the timeline
  if (!trackWrapper || !items.length || !imgEl) return;

  const SCROLL_AMOUNT = 300;

  // Arrow scroll buttons (desktop)
  if (leftArrow && rightArrow) {
    leftArrow.addEventListener("click", () => {
      trackWrapper.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" });
    });

    rightArrow.addEventListener("click", () => {
      trackWrapper.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
    });
  }

  // Click handlers for each timeline item
  items.forEach(item => {
    item.addEventListener("click", () => {
      const key = item.dataset.era;
      const data = ammoTimelineData[key];
      if (!data) return;

      // Set active state
      items.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      // Update details panel
      imgEl.src = data.img;
      imgEl.alt = data.alt;
      titleEl.textContent = data.title;
      yearsEl.textContent = data.years;
      bodyEl.innerHTML = data.body;
    });
  });
});
