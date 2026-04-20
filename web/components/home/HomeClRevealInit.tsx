"use client";

import { useEffect } from "react";

export function HomeClRevealInit() {
  useEffect(() => {
    const root = document.querySelector(".home-careerlab-scope");
    if (!root) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.classList.add("cl-reveal--visible");
        }
      },
      { threshold: 0.12 },
    );

    root.querySelectorAll(".cl-reveal").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return null;
}
