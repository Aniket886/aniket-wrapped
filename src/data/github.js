const GITHUB_USER = "Aniket886";
const SAMPLE_REPO_COUNT = 12;
const CACHE_KEY = "aniket-wrapped-cache-v1";
const CACHE_TTL = 1000 * 60 * 60 * 6;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    const error = new Error(`GitHub request failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function paginate(url) {
  const items = [];
  let page = 1;

  while (page <= 4) {
    const pageItems = await fetchJson(`${url}${url.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    items.push(...pageItems);
    if (pageItems.length < 100) {
      break;
    }
    page += 1;
  }

  return items;
}

function sumLanguageBytes(languageMaps) {
  const totals = {};

  languageMaps.forEach((map) => {
    Object.entries(map).forEach(([language, bytes]) => {
      totals[language] = (totals[language] || 0) + bytes;
    });
  });

  return Object.entries(totals)
    .map(([language, bytes]) => ({ language, bytes }))
    .sort((left, right) => right.bytes - left.bytes);
}

function pickFeaturedRepos(repos) {
  return [...repos]
    .filter((repo) => !repo.fork)
    .sort((left, right) => new Date(right.pushed_at) - new Date(left.pushed_at))
    .slice(0, SAMPLE_REPO_COUNT);
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      }),
    );
  } catch {
    // Ignore storage failures and rely on network.
  }
}

function getTopRepos(repos) {
  return [...repos]
    .filter((repo) => !repo.fork)
    .sort((left, right) => {
      if (right.stargazers_count !== left.stargazers_count) {
        return right.stargazers_count - left.stargazers_count;
      }
      return new Date(right.pushed_at) - new Date(left.pushed_at);
    })
    .slice(0, 3);
}

function getRecentRepos(repos) {
  return [...repos]
    .filter((repo) => !repo.fork)
    .sort((left, right) => new Date(right.pushed_at) - new Date(left.pushed_at))
    .slice(0, 3);
}

function getCommitEstimate(contributorMaps) {
  return contributorMaps.reduce((total, contributors) => {
    const contributor = contributors.find(
      (item) => item.author?.login?.toLowerCase() === GITHUB_USER.toLowerCase(),
    );
    return total + (contributor?.contributions || 0);
  }, 0);
}

function buildStory(profile, repos, featuredRepos, languages, commitEstimate) {
  const publicRepos = repos.length;
  const totalStars = repos.reduce((total, repo) => total + repo.stargazers_count, 0);
  const followers = profile.followers || 0;
  const topLanguages = languages.slice(0, 5);
  const primaryLanguage = topLanguages[0]?.language || "JavaScript";
  const totalLanguageBytes = topLanguages.reduce((total, item) => total + item.bytes, 0);

  return {
    generatedAt: new Date().toISOString(),
    profile,
    publicRepos,
    followers,
    totalStars,
    featuredRepoCount: featuredRepos.length,
    commitEstimate,
    topLanguages,
    topRepos: getTopRepos(repos),
    recentRepos: getRecentRepos(repos),
    topLanguageShare:
      totalLanguageBytes > 0
        ? Math.round((topLanguages[0].bytes / totalLanguageBytes) * 100)
        : 0,
    primaryLanguage,
  };
}

export async function loadWrappedStats() {
  const cached = readCache();
  if (cached) {
    return { data: cached, source: "cache" };
  }

  const profile = await fetchJson(`https://api.github.com/users/${GITHUB_USER}`);
  const repos = await paginate(`https://api.github.com/users/${GITHUB_USER}/repos?sort=updated`);
  const featuredRepos = pickFeaturedRepos(repos);

  const languageMaps = await Promise.all(
    featuredRepos.map((repo) => fetchJson(repo.languages_url).catch(() => ({}))),
  );

  const contributorMaps = await Promise.all(
    featuredRepos.map((repo) =>
      fetchJson(
        `https://api.github.com/repos/${GITHUB_USER}/${repo.name}/contributors?per_page=100`,
      ).catch(() => []),
    ),
  );

  const data = buildStory(
    profile,
    repos,
    featuredRepos,
    sumLanguageBytes(languageMaps),
    getCommitEstimate(contributorMaps),
  );

  writeCache(data);
  return { data, source: "network" };
}

export { GITHUB_USER, SAMPLE_REPO_COUNT };
