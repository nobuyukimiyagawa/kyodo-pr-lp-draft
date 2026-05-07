/* =========================================================
   KYODO PR LP — main script
   - Reveal-on-scroll (IntersectionObserver, with fallback)
   - Form validation + submit handler
   - Sticky bottom CTA visibility (mobile)
   - Active nav state
   ========================================================= */

(function () {
  "use strict";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ----- Reveal on scroll ----- */
  const initReveal = () => {
    const els = $$(".reveal");
    if (!els.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    els.forEach((el) => io.observe(el));
  };

  /* ----- Hero quick form: prefill main form & scroll ----- */
  const initHeroForm = () => {
    const heroForm = $("#heroForm");
    const mainForm = $("#contactForm");
    if (!heroForm || !mainForm) return;

    heroForm.addEventListener("submit", (e) => {
      e.preventDefault();
      // Validate hero fields
      $$("input", heroForm).forEach((i) => {
        i.dispatchEvent(new Event("input", { bubbles: true }));
      });
      if (!heroForm.checkValidity()) {
        const firstInvalid = heroForm.querySelector(":invalid");
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      // Prefill main form
      const map = { company: "f-company", name: "f-name", email: "f-email" };
      const data = new FormData(heroForm);
      Object.entries(map).forEach(([key, targetId]) => {
        const target = document.getElementById(targetId);
        const value = data.get(key);
        if (target && value) target.value = value;
      });
      // Scroll to main form
      const formSection = document.getElementById("form");
      if (formSection) {
        formSection.scrollIntoView({ behavior: "smooth", block: "start" });
        const titleField = document.getElementById("f-title");
        if (titleField) setTimeout(() => titleField.focus({ preventScroll: true }), 600);
      }
    });
  };

  /* ----- Form ----- */
  const initForm = () => {
    const form = $("#contactForm");
    const success = $("#formSuccess");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      // Trigger live validation feedback on all fields
      $$("input, textarea", form).forEach((i) => {
        i.dispatchEvent(new Event("input", { bubbles: true }));
      });

      if (!form.checkValidity()) {
        const firstInvalid = form.querySelector(":invalid");
        if (firstInvalid) {
          firstInvalid.focus();
          firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      // Collect submission
      const data = Object.fromEntries(new FormData(form).entries());

      // Replace with real endpoint
      // fetch('/api/lead', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) })

      form.style.display = "none";
      if (success) {
        success.classList.add("is-visible");
        success.setAttribute("tabindex", "-1");
        success.focus({ preventScroll: true });
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Analytics — replace with real implementation
      if (typeof window.gtag === "function") {
        window.gtag("event", "lead_form_submit", {
          method: "pr_diagnose",
          company: data.company || "",
        });
      }
    });
  };

  /* ----- Sticky bottom CTA (mobile) ----- */
  const initBottomCta = () => {
    const cta = $("#bottomCta");
    if (!cta) return;

    const hero = $(".hero");
    const formSection = $("#form");
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const heroH = hero ? hero.offsetHeight : 0;
      const formRect = formSection ? formSection.getBoundingClientRect() : null;
      const showAfterHero = y > heroH * 0.5;
      const nearForm = formRect ? formRect.top < window.innerHeight * 1.2 : false;
      cta.classList.toggle("is-visible", showAfterHero && !nearForm);
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );

    update();
  };

  /* ----- Active nav state via IntersectionObserver on sections ----- */
  const initActiveNav = () => {
    const links = $$(".header__nav a[href^='#']");
    if (!links.length || !("IntersectionObserver" in window)) return;

    const map = new Map();
    links.forEach((a) => {
      const id = a.getAttribute("href").slice(1);
      const sec = document.getElementById(id);
      if (sec) map.set(sec, a);
    });

    const setActive = (el) => {
      links.forEach((a) => a.removeAttribute("aria-current"));
      const a = map.get(el);
      if (a) a.setAttribute("aria-current", "true");
    };

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length) setActive(visible[0].target);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.3, 0.6] }
    );
    map.forEach((_, sec) => io.observe(sec));
  };

  /* ----- Init ----- */
  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initHeroForm();
    initForm();
    initBottomCta();
    initActiveNav();
  });
})();
