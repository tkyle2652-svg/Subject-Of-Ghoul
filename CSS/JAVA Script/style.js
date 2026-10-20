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

if (serverStatus && activeCount && serverStatusLight && activeCountLight) {
  const updateDiscordStatus = async () => {
    serverStatus.textContent = "Checking…";
    activeCount.textContent = "Loading…";

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

      if (!invite.guild || !Number.isInteger(presenceCount) || presenceCount < 0) {
        throw new Error("Discord did not return a valid server presence count");
      }

      serverStatus.textContent = "Online";
      serverStatus.title = "The Discord invite endpoint responded successfully.";
      serverStatusLight.classList.add("is-online");
      activeCount.textContent = presenceCount.toLocaleString();
      activeCount.title = "Approximate number of members online, reported by Discord.";
      activeCountLight.classList.add("is-active");
    } catch (error) {
      serverStatus.textContent = "Unavailable";
      serverStatus.title = error instanceof Error ? error.message : "Unable to load Discord server status.";
      serverStatusLight.classList.remove("is-online");
      activeCount.textContent = "Unavailable";
      activeCount.title = "Discord's approximate presence count could not be loaded.";
      activeCountLight.classList.remove("is-active");
    }
  };

  updateDiscordStatus();
  window.setInterval(updateDiscordStatus, 5 * 60 * 1000);
}