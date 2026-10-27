const layoutPreview = new URLSearchParams(window.location.search).get("view");

if (layoutPreview === "mobile" || layoutPreview === "desktop") {
  document.body.classList.add("layout-preview-active");

  const pageUrl = new URL(window.location.href);
  pageUrl.searchParams.delete("view");

  const previewBar = document.createElement("nav");
  previewBar.className = "layout-preview-bar";
  previewBar.setAttribute("aria-label", "Layout preview options");
  previewBar.innerHTML = `
    <span>Layout preview</span>
    <a href="?view=mobile#home" ${layoutPreview === "mobile" ? 'aria-current="page"' : ""}>Mobile</a>
    <a href="?view=desktop#home" ${layoutPreview === "desktop" ? 'aria-current="page"' : ""}>Desktop</a>
    <a href="${pageUrl.href}" class="layout-preview-responsive">Responsive page</a>
  `;

  const previewFrame = document.createElement("iframe");
  previewFrame.className = `layout-preview-frame layout-preview-frame-${layoutPreview}`;
  previewFrame.title = `${layoutPreview === "mobile" ? "Mobile" : "Desktop"} version of Subject of Ghouls`;
  previewFrame.referrerPolicy = "strict-origin-when-cross-origin";

  previewFrame.src = pageUrl.href;

  document.body.replaceChildren(previewBar, previewFrame);
}

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#site-navigation");

if (menuButton && navigation) {
  const closeMenu = () => {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    navigation.classList.remove("is-open");
  };

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    navigation.classList.toggle("is-open", !isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

const year = document.querySelector("#current-year");
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const faqItems = [...document.querySelectorAll(".faq-item")];

if (faqItems.length > 0) {
  document.body.classList.add("faq-enhanced");

  const faqAnimations = new WeakMap();
  const faqOpenStates = new WeakMap(faqItems.map((item) => [item, item.open]));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  for (const item of faqItems) {
    const summary = item.querySelector("summary");
    const answer = item.querySelector(".faq-answer");

    if (!summary || !answer) {
      continue;
    }

    summary.setAttribute("aria-expanded", String(item.open));

    item.addEventListener("toggle", () => {
      faqOpenStates.set(item, item.open);
      summary.setAttribute("aria-expanded", String(item.open));
    });

    summary.addEventListener("click", (event) => {
      event.preventDefault();

      const currentAnimation = faqAnimations.get(item);
      const currentHeight = answer.getBoundingClientRect().height;
      const shouldOpen = !faqOpenStates.get(item);

      if (currentAnimation) {
        answer.style.height = `${currentHeight}px`;
        currentAnimation.cancel();
      }

      faqOpenStates.set(item, shouldOpen);
      summary.setAttribute("aria-expanded", String(shouldOpen));

      if (shouldOpen) {
        item.open = true;
      }

      const targetHeight = shouldOpen ? answer.scrollHeight : 0;
      if (reducedMotion.matches) {
        item.open = shouldOpen;
        answer.style.height = "";
        faqAnimations.delete(item);
        return;
      }

      const animation = answer.animate(
        [
          { height: `${currentHeight}px`, opacity: shouldOpen ? 0.72 : 1, transform: `translateY(${shouldOpen ? "8px" : "0"})` },
          { height: `${targetHeight}px`, opacity: shouldOpen ? 1 : 0, transform: `translateY(${shouldOpen ? "0" : "-6px"})` },
        ],
        {
          duration: shouldOpen ? 360 : 260,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        },
      );

      faqAnimations.set(item, animation);
      animation.addEventListener("finish", () => {
        if (faqAnimations.get(item) !== animation) {
          return;
        }

        if (!shouldOpen) {
          item.open = false;
        }

        answer.style.height = "";
        faqAnimations.delete(item);
      }, { once: true });

      animation.addEventListener("cancel", () => {
        if (faqAnimations.get(item) === animation) {
          faqAnimations.delete(item);
        }
      }, { once: true });
    });
  }
}

const regimentTime = document.querySelector("#regiment-time");
const connectionStatus = document.querySelector("#connection-status");

if (regimentTime) {
  const updateRegimentTime = () => {
    regimentTime.textContent = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date());
  };

  updateRegimentTime();
  window.setInterval(updateRegimentTime, 1000);
}

if (connectionStatus) {
  if (window.location.protocol === "https:") {
    connectionStatus.textContent = "HTTPS encrypted";
    connectionStatus.title = "HTTPS encrypts this connection; it does not replace a site security audit.";
    connectionStatus.classList.add("is-secure");
  } else if (window.location.protocol === "file:") {
    connectionStatus.textContent = "Local preview";
    connectionStatus.title = "This page is opened from a local file, not served over HTTPS.";
  } else {
    connectionStatus.textContent = "Not encrypted";
    connectionStatus.title = "This connection is not using HTTPS encryption.";
  }
}

const serverStatus = document.querySelector("#discord-server-status");
const activeCount = document.querySelector("#discord-active-count");
const serverStatusLight = document.querySelector("#discord-status-light");
const activeCountLight = document.querySelector("#discord-active-light");
const serverCreatedDate = document.querySelector("#discord-created-date");

if (serverStatus && activeCount && serverStatusLight && activeCountLight && serverCreatedDate) {
  const updateDiscordStatus = async () => {
    serverStatus.textContent = "Checking…";
    activeCount.textContent = "Loading…";
    serverCreatedDate.textContent = "Loading…";

    try {
      const response = await fetch(
        "https://discord.com/api/v10/invites/QcCfeXmCjn?with_counts=true",
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(`Discord returned HTTP ${response.status}`);
      }

      const invite = await response.json();
      const presenceCount = invite.approximate_presence_count;

      if (
        !invite.guild ||
        !/^\d+$/.test(invite.guild.id) ||
        !Number.isInteger(presenceCount) ||
        presenceCount < 0
      ) {
        throw new Error("Discord did not return a valid server presence count");
      }

      const discordEpoch = 1420070400000n;
      const createdAtMilliseconds = Number((BigInt(invite.guild.id) >> 22n) + discordEpoch);
      const createdAt = new Date(createdAtMilliseconds);

      if (Number.isNaN(createdAt.getTime())) {
        throw new Error("Discord returned an invalid server creation date");
      }

      serverStatus.textContent = "Online";
      serverStatus.title = "The Discord invite endpoint responded successfully.";
      serverStatusLight.classList.add("is-online");
      activeCount.textContent = presenceCount.toLocaleString();
      activeCount.title = "Approximate number of members online, reported by Discord.";
      activeCountLight.classList.add("is-active");
      serverCreatedDate.textContent = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(createdAt);
      serverCreatedDate.title = `Discord server created ${createdAt.toISOString().slice(0, 10)}.`;
    } catch (error) {
      serverStatus.textContent = "Unavailable";
      serverStatus.title = error instanceof Error ? error.message : "Unable to load Discord server status.";
      serverStatusLight.classList.remove("is-online");
      activeCount.textContent = "Unavailable";
      activeCount.title = "Discord's approximate presence count could not be loaded.";
      activeCountLight.classList.remove("is-active");
      serverCreatedDate.textContent = "Unavailable";
      serverCreatedDate.title = error instanceof Error ? error.message : "Unable to load Discord server creation date.";
    }
  };

  updateDiscordStatus();
  window.setInterval(updateDiscordStatus, 5 * 60 * 1000);
}

const discordAvatarEndpoint = document.querySelector('meta[name="discord-avatar-api"]')?.content.trim();
const staffAvatars = [...document.querySelectorAll(".staff-avatar[data-discord-user-id]")];

if (discordAvatarEndpoint && staffAvatars.length > 0) {
  const updateStaffAvatars = async () => {
    try {
      const endpoint = new URL(discordAvatarEndpoint);
      if (endpoint.protocol !== "https:") {
        throw new Error("The Discord avatar endpoint must use HTTPS.");
      }

      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Discord avatar endpoint returned HTTP ${response.status}.`);
      }

      const result = await response.json();
      if (!result.avatars || typeof result.avatars !== "object") {
        throw new Error("Discord avatar endpoint returned an invalid response.");
      }

      if (Array.isArray(result.errors) && result.errors.length > 0) {
        console.warn("Discord avatar refresh failed for some staff IDs.", result.errors);
      }

      for (const image of staffAvatars) {
        const avatarUrl = result.avatars[image.dataset.discordUserId];
        if (avatarUrl === null || avatarUrl === undefined) {
          continue;
        }

        const parsedAvatarUrl = new URL(avatarUrl);
        if (parsedAvatarUrl.protocol !== "https:" || parsedAvatarUrl.hostname !== "cdn.discordapp.com") {
          throw new Error("Discord avatar endpoint returned an unexpected image URL.");
        }

        if (image.src !== parsedAvatarUrl.href) {
          image.src = parsedAvatarUrl.href;
        }
      }
    } catch (error) {
      console.error("Unable to refresh Discord staff avatars.", error);
    }
  };

  updateStaffAvatars();
  window.setInterval(updateStaffAvatars, 5 * 60 * 1000);
}