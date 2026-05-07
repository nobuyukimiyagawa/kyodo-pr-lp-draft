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

  /* ----- Hero form variant swap (?form=step) + step navigation ----- */
  const initFormVariant = () => {
    const params = new URLSearchParams(location.search);
    const requested = params.get("form") === "step" ? "step" : "scroll";
    const variants = $$("[data-form-variant]");
    if (!variants.length) return;
    variants.forEach((el) => {
      el.hidden = el.dataset.formVariant !== requested;
    });
    if (requested === "step") initHeroFormStep();
  };

  const initHeroFormStep = () => {
    const form = $("#heroFormStep");
    if (!form) return;
    const steps = $$(".step", form);
    const current = $(".step-current");
    const total = $(".step-total");
    const back = $(".step__back", form);
    const next = $(".step__next", form);
    const submit = $(".step__submit", form);
    const progressBar = $(".hero__form-progress-bar");
    if (total) total.textContent = String(steps.length);

    const setActive = (index) => {
      steps.forEach((s, i) => {
        if (i === index) s.setAttribute("data-active", "true");
        else s.removeAttribute("data-active");
      });
      if (current) current.textContent = String(index + 1);
      if (back) back.disabled = index === 0;
      const isLast = index === steps.length - 1;
      if (next) next.hidden = isLast;
      if (submit) submit.hidden = !isLast;
      if (progressBar) progressBar.style.width = `${((index + 1) / steps.length) * 100}%`;
      // Focus first input/select in active step
      const focusable = steps[index].querySelector("input, select");
      if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 80);
    };

    let idx = 0;
    setActive(idx);

    const validateCurrent = () => {
      const fields = $$("input, select", steps[idx]);
      for (const f of fields) {
        if (f.required && !f.checkValidity()) {
          f.focus();
          return false;
        }
      }
      return true;
    };

    if (next) {
      next.addEventListener("click", () => {
        if (!validateCurrent()) return;
        if (idx < steps.length - 1) {
          idx++;
          setActive(idx);
        }
      });
    }
    if (back) {
      back.addEventListener("click", () => {
        if (idx > 0) {
          idx--;
          setActive(idx);
        }
      });
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validateCurrent()) return;
      // Placeholder: real submit endpoint would go here
      alert("ご入力ありがとうございました。担当者よりご連絡いたします。");
    });
    // Allow Enter key on inputs to advance
    form.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const tag = e.target.tagName;
      if (tag === "TEXTAREA") return;
      if (tag === "BUTTON") return;
      e.preventDefault();
      if (idx === steps.length - 1) {
        if (submit) submit.click();
      } else {
        if (next) next.click();
      }
    });
  };

  /* ----- Init ----- */
  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initFormVariant();
    initHeroForm();
    initForm();
    initBottomCta();
    initActiveNav();
  });
})();
