const STAFF_USER_IDS = [
  "1333084356469719126",
  "1155508137281990786",
  "1020798742699450458",
  "1395850621126709299",
  "1536227127140024361",
  "1511655800542597162",
  "1408623408077602946",
  "1401297336541511774",
  "1531656745653370975",
  "1445497181409906718",
  "1235919266587475990",
];

const CACHE_TTL_SECONDS = 300;
const CACHE_BASE_URL = "https://discord-staff-avatar-cache.invalid";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Accept",
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function getAvatarUrl(member, guildId) {
  const userId = member.user.id;

  if (member.avatar) {
    return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${encodeURIComponent(member.avatar)}.${member.avatar.startsWith("a_") ? "gif" : "webp"}?size=256`;
  }

  if (member.user.avatar) {
    return `https://cdn.discordapp.com/avatars/${userId}/${encodeURIComponent(member.user.avatar)}.${member.user.avatar.startsWith("a_") ? "gif" : "webp"}?size=256`;
  }

  const defaultAvatarIndex = (BigInt(userId) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
}

async function getGuildMember(userId, env) {
  const cache = caches.default;
  const cacheKey = new Request(`${CACHE_BASE_URL}/${userId}`);
  const cached = await cache.match(cacheKey);

  if (cached) {
    return cached.json();
  }

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${userId}`,
    {
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        Accept: "application/json",
      },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Discord returned HTTP ${response.status} for member ${userId}.`);
  }

  const member = await response.json();
  if (member.user?.id !== userId) {
    throw new Error(`Discord returned an unexpected member for ${userId}.`);
  }

  await cache.put(
    cacheKey,
    new Response(JSON.stringify(member), {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
        "Content-Type": "application/json",
      },
    }),
  );

  return member;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Accept",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "GET" || pathname !== "/api/staff-avatars") {
      return jsonResponse({ error: "Not found." }, 404);
    }

    if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) {
      return jsonResponse({ error: "Discord avatar service is not configured." }, 503);
    }

    const errors = [];
    const results = await Promise.all(
      STAFF_USER_IDS.map(async (userId) => {
        try {
          const member = await getGuildMember(userId, env);
          return [userId, member ? getAvatarUrl(member, env.DISCORD_GUILD_ID) : null];
        } catch (error) {
          errors.push(userId);
          console.error("Discord staff avatar lookup failed.", {
            userId,
            error: error instanceof Error ? error.message : String(error),
          });
          return [userId, null];
        }
      }),
    );

    const avatars = Object.fromEntries(results);
    if (Object.values(avatars).every((avatar) => avatar === null)) {
      return jsonResponse({ error: "Discord staff avatars could not be loaded.", avatars, errors }, 502);
    }

    return jsonResponse({ avatars, errors });
  },
};
