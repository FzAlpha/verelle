/* ==========================================================================
   VÉRELLE® — interactions
   GSAP 3.13 (ScrollTrigger + SplitText) · Lenis smooth scroll
   ========================================================================== */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Always start at the top: the loader hands over to the hero
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ ease: "expo.out", duration: 1.2 });

  /* ------------------------------------------------------------------
     Lenis smooth scroll, driven by GSAP's ticker
     ------------------------------------------------------------------ */
  let lenis = null;
  if (!reduceMotion && typeof Lenis !== "undefined") {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  const scrollToTarget = (target) => {
    if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
    else target.scrollIntoView({ behavior: "smooth" });
  };

  /* ------------------------------------------------------------------
     Fit giant words to the full measure of the grid
     ------------------------------------------------------------------ */
  const fitText = (box, parts) => {
    const cs = getComputedStyle(box);
    const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const measure = () => parts.reduce((sum, el) => {
      const m = parseFloat(getComputedStyle(el).marginLeft) || 0;
      return sum + el.getBoundingClientRect().width + m;
    }, 0);
    let size = 100;
    box.style.fontSize = `${size}px`;
    // two passes: the second corrects for non-linear rounding at large sizes
    for (let i = 0; i < 2; i++) {
      size = Math.floor(size * (avail / measure()) * 0.995 * 100) / 100;
      box.style.fontSize = `${size}px`;
    }
  };
  const heroTitle = $(".hero__title");
  const giant = $(".footer__giant");
  const fitAll = () => {
    fitText(heroTitle, [$(".hero__word"), $(".hero__reg")]);
    fitText(giant, [$(".giant__word"), $(".giant__reg")]);
  };
  // Refit when the boxes' width changes (e.g. scrollbar appears after the loader)
  if ("ResizeObserver" in window) {
    let lastW = 0;
    new ResizeObserver(() => {
      if (giant.clientWidth === lastW) return;
      lastW = giant.clientWidth;
      fitAll();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }).observe(giant);
  }

  /* ------------------------------------------------------------------
     Zürich clock
     ------------------------------------------------------------------ */
  const clockFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false, timeZoneName: "short",
  });
  const clocks = $$(".clock");
  const tick = () => {
    const parts = clockFmt.formatToParts(new Date());
    const get = (t) => (parts.find((p) => p.type === t) || {}).value || "";
    const txt = `${get("hour")}:${get("minute")}:${get("second")} ${get("timeZoneName").replace("GMT+1", "CET").replace("GMT+2", "CEST")}`;
    clocks.forEach((c) => (c.textContent = txt));
  };
  tick();
  setInterval(tick, 1000);

  /* ------------------------------------------------------------------
     Grid overlay — a tribute to Müller-Brockmann (press G)
     ------------------------------------------------------------------ */
  const gridBtn = $(".grid-toggle");
  $$(".grid-overlay span").forEach((s, i) => s.style.setProperty("--i", i));
  const toggleGrid = () => {
    const on = document.body.classList.toggle("show-grid");
    if (gridBtn) gridBtn.setAttribute("aria-pressed", String(on));
  };
  gridBtn && gridBtn.addEventListener("click", toggleGrid);
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !/input|textarea/i.test(e.target.tagName)) toggleGrid();
  });

  /* ------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------ */
  const menu = $(".menu");
  const menuBtn = $(".menu-btn");
  const menuLinks = $$(".menu__t");
  let menuOpen = false;
  const menuTl = gsap.timeline({ paused: true })
    .set(menu, { visibility: "visible" })
    .to(menu, { clipPath: "inset(0 0 0% 0)", duration: 0.9, ease: "expo.inOut" })
    .from(menuLinks, { yPercent: 110, duration: 1, stagger: 0.06 }, "-=0.4")
    .from(".menu__n, .menu__foot", { autoAlpha: 0, y: 12, duration: 0.8, stagger: 0.04 }, "-=0.9");

  const setMenu = (open) => {
    if (open === menuOpen) return;
    menuOpen = open;
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-hidden", String(!open));
    $(".menu-btn__txt").textContent = open ? "Close" : "Menu";
    if (open) { lenis && lenis.stop(); menuTl.timeScale(1).play(); }
    else { lenis && lenis.start(); menuTl.timeScale(1.6).reverse(); }
  };
  menuBtn.addEventListener("click", () => setMenu(!menuOpen));

  $$("[data-scroll-to]").forEach((a) =>
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      e.preventDefault();
      const target = href === "#top" ? 0 : $(href);
      if (menuOpen) { setMenu(false); setTimeout(() => scrollToTarget(target), 450); }
      else scrollToTarget(target);
    })
  );

  /* ------------------------------------------------------------------
     Custom cursor + work preview (desktop only)
     ------------------------------------------------------------------ */
  if (finePointer && !reduceMotion) {
    const cursor = $(".cursor");
    const cx = gsap.quickTo(cursor, "x", { duration: 0.18, ease: "power3" });
    const cy = gsap.quickTo(cursor, "y", { duration: 0.18, ease: "power3" });

    const preview = $(".preview");
    const inner = $(".preview__inner");
    const px = gsap.quickTo(preview, "x", { duration: 0.7, ease: "power3" });
    const py = gsap.quickTo(preview, "y", { duration: 0.7, ease: "power3" });
    const pr = gsap.quickTo(preview, "rotation", { duration: 0.9, ease: "power3" });
    let lastX = 0;

    window.addEventListener("pointermove", (e) => {
      cx(e.clientX); cy(e.clientY);
      px(e.clientX); py(e.clientY);
      pr(gsap.utils.clamp(-12, 12, (e.clientX - lastX) * 0.6));
      lastX = e.clientX;
    });

    $$("a, button").forEach((el) => {
      if (el.closest(".work__item")) return;
      el.addEventListener("mouseenter", () => cursor.classList.add("is-link"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-link"));
    });

    const items = $$(".work__item");
    const imgs = items.map((it) => {
      const img = new Image();
      img.src = it.dataset.img;
      img.alt = "";
      img.decoding = "async";
      inner.appendChild(img);
      return img;
    });
    let z = 1;
    const list = $(".work__list");
    list.addEventListener("mouseenter", () => {
      cursor.classList.add("is-view");
      gsap.to(inner, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "expo.out", overwrite: true });
    });
    list.addEventListener("mouseleave", () => {
      cursor.classList.remove("is-view");
      gsap.to(inner, { clipPath: "inset(50% 50% 50% 50%)", duration: 0.6, ease: "expo.out", overwrite: true });
    });
    items.forEach((it, i) =>
      it.addEventListener("mouseenter", () => {
        imgs[i].style.zIndex = ++z;
        gsap.fromTo(imgs[i],
          { clipPath: "inset(100% 0% 0% 0%)", scale: 1.25 },
          { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 0.9, ease: "expo.out", overwrite: true });
      })
    );
  }

  /* ------------------------------------------------------------------
     Header — hide on scroll down, reveal on scroll up
     ------------------------------------------------------------------ */
  const header = $(".header");
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      if (menuOpen) return;
      const hide = self.direction === 1 && self.scroll() > 240;
      gsap.to(header, { yPercent: hide ? -160 : 0, duration: 0.7, ease: "expo.out", overwrite: "auto" });
    },
  });

  /* ------------------------------------------------------------------
     Reduced motion: show everything, skip choreography
     ------------------------------------------------------------------ */
  if (reduceMotion) {
    document.fonts.ready.then(fitAll);
    window.addEventListener("resize", fitAll);
    gsap.set(".loader", { display: "none" });
    document.body.classList.remove("is-loading");
    return;
  }

  /* ------------------------------------------------------------------
     Marquee — duplicates content, speed & direction follow scroll velocity
     ------------------------------------------------------------------ */
  const mTrack = $(".marquee__track");
  mTrack.innerHTML += mTrack.innerHTML;
  const marquee = gsap.to(mTrack, { xPercent: -50, ease: "none", duration: 32, repeat: -1 });
  marquee.totalTime(marquee.duration() * 100);
  let mDir = 1;
  ScrollTrigger.create({
    trigger: ".marquee",
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      mDir = self.direction;
      const v = gsap.utils.clamp(1, 7, Math.abs(self.getVelocity()) / 250);
      gsap.timeline({ overwrite: true })
        .to(marquee, { timeScale: mDir * v, duration: 0.2, ease: "power2.out" })
        .to(marquee, { timeScale: mDir, duration: 1.2, ease: "power2.out" });
    },
  });

  /* ------------------------------------------------------------------
     Initial states (set before the loader lifts)
     ------------------------------------------------------------------ */
  let heroChars;
  const prepHero = () => {
    fitAll();
    heroChars = SplitText.create(".hero__word", { type: "chars", charsClass: "char" });
    gsap.set(heroChars.chars, { yPercent: 108 });
    gsap.set(".hero__reg", { autoAlpha: 0, y: 20 });
    gsap.set("[data-hero-fade]", { autoAlpha: 0, y: 24 });
    gsap.set(".hero__media .img-wrap", { clipPath: "inset(100% 0% 0% 0%)" });
    gsap.set(".hero__media img", { scale: 1.35 });
    gsap.set(".hero__square", { scale: 0, transformOrigin: "0% 100%" });
    gsap.set(header, { autoAlpha: 0, y: -16 });
  };

  const heroIn = () => {
    const tl = gsap.timeline();
    tl.to(heroChars.chars, { yPercent: 0, duration: 1.5, stagger: 0.055 }, 0)
      .to(".hero__reg", { autoAlpha: 1, y: 0, duration: 1 }, 0.5)
      .to(header, { autoAlpha: 1, y: 0, duration: 1 }, 0.3)
      .to("[data-hero-fade]", { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.35)
      .to(".hero__media .img-wrap", { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" }, 0.2)
      .to(".hero__media img", { scale: 1, duration: 2.2, ease: "expo.out" }, 0.55)
      .to(".hero__square", { scale: 1, duration: 1.3, ease: "expo.inOut" }, 0.6)
      .add(() => {
        document.body.classList.remove("is-loading");
        lenis && lenis.start();
      }, 0.6);
    return tl;
  };

  /* ------------------------------------------------------------------
     Preloader
     ------------------------------------------------------------------ */
  const runLoader = () => {
    const digits = $$(".loader__digit");
    const frames = $$(".loader__frame img");
    const bar = $(".loader__bar span");

    // Real progress: loader frames + hero image + webfonts
    const watch = [...frames, $(".hero__media img")].filter(Boolean);
    const total = watch.length + 1;
    let done = 0;
    const mark = () => done++;
    watch.forEach((img) => {
      if (img.complete) return mark();
      img.addEventListener("load", mark, { once: true });
      img.addEventListener("error", mark, { once: true });
    });
    document.fonts.ready.then(mark);

    // Each digit rolls: old glyph out the top, new glyph in from below
    const setCount = (n) => {
      String(n).padStart(3, "0").split("").forEach((ch, i) => {
        const box = digits[i];
        const cur = box.lastElementChild;
        if (cur.textContent === ch) return;
        while (box.children.length > 1) box.removeChild(box.firstElementChild);
        const nw = document.createElement("span");
        nw.textContent = ch;
        box.appendChild(nw);
        gsap.fromTo(nw, { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: "expo.out", delay: i * 0.04 });
        gsap.to(cur, {
          yPercent: -110, duration: 0.55, ease: "expo.out", delay: i * 0.04,
          onComplete: () => cur.parentNode && cur.parentNode.removeChild(cur),
        });
      });
    };

    let frameIdx = -1;
    const showFrame = (i) => {
      if (i === frameIdx || !frames[i]) return;
      frameIdx = i;
      frames.forEach((f, k) => (f.style.visibility = k === i ? "visible" : "hidden"));
      gsap.fromTo(frames[i], { scale: 1.18 }, { scale: 1, duration: 1, ease: "expo.out" });
    };

    // Stepped count: never faster than MIN, never stuck past MAX
    let t0 = performance.now();
    const MIN = 2600, MAX = 9000;
    let shown = 0;

    // Intro: wait (briefly) for the first frame to decode so it never shows empty
    const firstReady = Promise.race([
      frames[0] && frames[0].decode ? frames[0].decode().catch(() => {}) : Promise.resolve(),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
    firstReady.then(() => {
      showFrame(0);
      gsap.timeline()
        .set(".loader__ui", { autoAlpha: 1 })
        .from(".loader__top > *", { autoAlpha: 0, y: 14, duration: 1, stagger: 0.07 }, 0)
        .fromTo(".loader__frame", { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "expo.inOut" }, 0.05)
        .from(".loader__digit span", { yPercent: 110, duration: 1, stagger: 0.06 }, 0.2)
        .from(".loader__bar", { scaleX: 0, transformOrigin: "0% 50%", duration: 1.2, ease: "expo.inOut" }, 0.1);
      t0 = performance.now();
      gsap.delayedCall(0.8, step);
    });

    const exit = () => {
      gsap.timeline()
        .to(bar, { scaleX: 1, duration: 0.4, ease: "expo.out" }, 0)
        .to(".loader__digit span", { yPercent: -110, duration: 0.75, ease: "expo.in", stagger: 0.05 }, 0.3)
        .to(".loader__top > *", { autoAlpha: 0, y: -12, duration: 0.5, ease: "power2.in", stagger: 0.04 }, 0.3)
        .to(".loader__bar", { scaleX: 0, transformOrigin: "100% 50%", duration: 0.7, ease: "expo.in" }, 0.3)
        .to(".loader__frame", { clipPath: "inset(0% 0% 100% 0%)", duration: 0.9, ease: "expo.inOut" }, 0.35)
        .to(".loader__cols span", { yPercent: -100, duration: 1.15, ease: "expo.inOut", stagger: 0.045 }, 0.95)
        .add(heroIn(), 1.25)
        .set(".loader", { display: "none" });
    };

    const step = () => {
      const elapsed = performance.now() - t0;
      const real = elapsed > MAX ? 1 : done / total;
      const target = Math.floor(Math.min(real, Math.min(1, elapsed / MIN)) * 100);
      if (target > shown) {
        shown = Math.min(target, shown + gsap.utils.random(8, 26, 1));
        setCount(shown);
        gsap.to(bar, { scaleX: shown / 100, duration: 0.7, ease: "expo.out", overwrite: true });
        showFrame(Math.round((shown / 100) * (frames.length - 1)));
      }
      if (shown >= 100) gsap.delayedCall(0.35, exit);
      else gsap.delayedCall(gsap.utils.random(0.24, 0.42), step);
    };
  };

  /* ------------------------------------------------------------------
     Scroll choreography
     ------------------------------------------------------------------ */
  const buildScroll = () => {
    // Hero parallax
    gsap.to(".hero__media img", {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: ".hero__media", start: "top 60%", end: "bottom top", scrub: true },
    });
    gsap.to(".hero__title", {
      yPercent: 18, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
    $$("[data-speed]").forEach((el) => {
      gsap.to(el, {
        y: () => window.innerHeight * parseFloat(el.dataset.speed), ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
      });
    });

    // Headline line reveals
    $$("[data-split]").forEach((el) => {
      SplitText.create(el, {
        type: "lines", mask: "lines", linesClass: "line", autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 110, duration: 1.4, stagger: 0.1,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          }),
      });
    });

    // Small text reveals
    $$("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0, y: 28, duration: 1.2,
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    });

    // Manifesto: word-by-word scrub
    const mText = $("[data-words]");
    const mSplit = SplitText.create(mText, { type: "words", wordsClass: "word" });
    gsap.fromTo(mSplit.words, { opacity: 0.12 }, {
      opacity: 1, ease: "none", stagger: 0.08,
      scrollTrigger: { trigger: mText, start: "top 80%", end: "bottom 50%", scrub: 0.6 },
    });

    // Work rows slide in
    $$(".work__item").forEach((it) => {
      gsap.from(it, {
        y: 50, autoAlpha: 0, duration: 1.2,
        scrollTrigger: { trigger: it, start: "top 94%", once: true },
      });
    });

    // Image reveals (team etc.)
    $$(".img-reveal").forEach((fig) => {
      if (fig.classList.contains("hero__media")) return;
      const wrap = fig.querySelector(".img-wrap");
      const img = fig.querySelector("img");
      gsap.timeline({ scrollTrigger: { trigger: fig, start: "top 88%", once: true } })
        .fromTo(wrap, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" })
        .fromTo(img, { scale: 1.35 }, { scale: 1, duration: 1.8 }, 0.25);
    });
    gsap.from(".person figcaption", {
      autoAlpha: 0, y: 16, duration: 1, stagger: 0.1,
      scrollTrigger: { trigger: ".team__list", start: "top 75%", once: true },
    });

    // Principles: rules draw, numbers rise
    $$(".principle").forEach((p, i) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: p, start: "top 88%", once: true }, delay: (i % 4) * 0.08 });
      tl.fromTo(p.querySelector(".principle__rule"), { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "expo.inOut" })
        .from(p.querySelector(".principle__n"), { yPercent: 60, autoAlpha: 0, duration: 1.2 }, 0.3)
        .from(p.querySelectorAll("h3, .principle__txt"), { y: 24, autoAlpha: 0, duration: 1, stagger: 0.08 }, 0.45);
    });

    // Counters
    $$("[data-count]").forEach((el) => {
      const end = +el.dataset.count;
      const o = { v: 0 };
      gsap.to(o, {
        v: end, duration: 2.2, ease: "power3.out",
        onUpdate: () => (el.textContent = Math.round(o.v)),
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });
    gsap.utils.toArray(".num").forEach((n) =>
      gsap.from(n, { autoAlpha: 0, y: 30, duration: 1.2, scrollTrigger: { trigger: n, start: "top 92%", once: true } })
    );

    // Footer
    gsap.from(".footer__word", {
      yPercent: 105, duration: 1.5, stagger: 0.12,
      scrollTrigger: { trigger: ".footer__cta", start: "top 85%", once: true },
    });
    const giantSplit = SplitText.create(".giant__word", { type: "chars", charsClass: "gchar" });
    gsap.from([...giantSplit.chars, ".giant__reg"], {
      yPercent: 100, ease: "none", stagger: 0.05,
      scrollTrigger: { trigger: giant, start: "top bottom", end: "bottom bottom", scrub: 0.8 },
    });

    // Breakpoint-specific scenes
    const mm = gsap.matchMedia();

    mm.add("(min-width: 900px)", () => {
      // Horizontal archive
      const track = $(".archive__track");
      const dist = () => track.scrollWidth - window.innerWidth;
      const h = gsap.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: {
          trigger: ".archive__pin", start: "top top", end: () => `+=${dist()}`,
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        },
      });
      $$(".card__img img").forEach((img) => {
        gsap.fromTo(img, { xPercent: -7 }, {
          xPercent: 7, ease: "none",
          scrollTrigger: { trigger: img.parentNode, containerAnimation: h, start: "left right", end: "right left", scrub: true },
        });
      });
      $$(".card .fig").forEach((f) => {
        gsap.from(f, {
          autoAlpha: 0, y: 12, duration: 0.8,
          scrollTrigger: { trigger: f, containerAnimation: h, start: "left 85%", once: true },
        });
      });
    });

    mm.add("(max-width: 899px)", () => {
      gsap.from(".card", {
        autoAlpha: 0, x: 60, duration: 1.2, stagger: 0.08,
        scrollTrigger: { trigger: ".archive__track", start: "top 85%", once: true },
      });
    });

    // Zoom statement (both)
    mm.add({ desktop: "(min-width: 900px)", mobile: "(max-width: 899px)" }, (ctx) => {
      const { desktop } = ctx.conditions;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: ".zoom__pin", start: "top top", end: "+=160%", pin: true, scrub: 1, anticipatePin: 1 },
      });
      tl.fromTo(".zoom__frame",
          { clipPath: desktop ? "inset(26% 34% 26% 34%)" : "inset(30% 18% 30% 18%)" },
          { clipPath: "inset(0% 0% 0% 0%)", ease: "none" }, 0)
        .fromTo(".zoom__frame img", { scale: 1.35 }, { scale: 1, ease: "none" }, 0)
        .fromTo(".zoom__frame", { "--shade": 0 }, { "--shade": 1, ease: "none", duration: 0.4 }, 0.45)
        .fromTo(".zoom__text", { color: "#0b0b0b" }, { color: "#ffffff", ease: "none", duration: 0.25 }, 0.4)
        .fromTo(".zoom__l", { x: () => -window.innerWidth * 0.25 }, { x: 0, ease: "none" }, 0)
        .fromTo(".zoom__r", { x: () => window.innerWidth * 0.25 }, { x: 0, ease: "none" }, 0);
    });
  };

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  prepHero();
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    fitAll();
    try { buildScroll(); } catch (e) { console.error(e); }
    fitAll(); // re-measure once words are split into chars (kerning changes width)
    runLoader();
    ScrollTrigger.refresh();
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());

  let rw = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === rw) return; // ignore mobile URL-bar height changes
    rw = window.innerWidth;
    fitAll();
    ScrollTrigger.refresh();
  });
})();
