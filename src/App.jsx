import { useEffect, useState } from "react";
import { GITHUB_USER, SAMPLE_REPO_COUNT, loadWrappedStats } from "./data/github";
import {
  formatCompactNumber,
  formatDate,
  formatLongNumber,
  sentenceCase,
} from "./lib/format";

function StatCard({ label, value, detail, tone = "default" }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}

function RepoCard({ repo, index, compact = false }) {
  return (
    <article className={`repo-card ${compact ? "repo-card--compact" : ""}`}>
      <div className="repo-card__eyebrow">#{index + 1}</div>
      <h3>{repo.name}</h3>
      <p>{repo.description || "Built with intent, shipped with clean edges."}</p>
      <div className="repo-card__meta">
        <span>{repo.language || "Mixed stack"}</span>
        <span>{formatCompactNumber(repo.stargazers_count)} stars</span>
      </div>
    </article>
  );
}

function LanguageBars({ items }) {
  const total = items.reduce((sum, item) => sum + item.bytes, 0);

  return (
    <div className="language-list">
      {items.map((item, index) => {
        const share = total > 0 ? Math.max(8, Math.round((item.bytes / total) * 100)) : 8;
        return (
          <div className="language-row" key={item.language}>
            <div className="language-row__label">
              <span>{index + 1}</span>
              <strong>{item.language}</strong>
            </div>
            <div className="language-row__bar">
              <div style={{ width: `${share}%` }} />
            </div>
            <em>{share}%</em>
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [state, setState] = useState({
    status: "loading",
    data: null,
    error: null,
    source: null,
  });

  useEffect(() => {
    let active = true;

    loadWrappedStats()
      .then(({ data, source }) => {
        if (!active) return;
        setState({
          status: "ready",
          data,
          error: null,
          source,
        });
      })
      .catch((error) => {
        if (!active) return;
        setState({
          status: "error",
          data: null,
          error,
          source: null,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <main className="shell">
        <section className="hero hero--loading">
          <p className="eyebrow">Aniket Wrapped</p>
          <h1>Pulling together the best parts of {GITHUB_USER}&apos;s GitHub story.</h1>
          <div className="loading-orb" />
          <span className="subtle">
            Fetching public profile, repos, languages, and contribution estimates.
          </span>
        </section>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="shell">
        <section className="hero hero--error">
          <p className="eyebrow">Public API Limit</p>
          <h1>GitHub didn&apos;t hand back the wrapped data this time.</h1>
          <p className="lede">
            {state.error?.status === 403
              ? "The public rate limit was hit. Reload later, or revisit after GitHub resets unauthenticated requests."
              : "A public GitHub request failed. This page expects browser access to GitHub&apos;s REST API."}
          </p>
        </section>
      </main>
    );
  }

  const { data, source } = state;
  const heroRepo = data.topRepos[0];
  const recentDrop = data.recentRepos[0];

  return (
    <main className="shell">
      <section className="hero panel">
        <div className="hero__copy">
          <p className="eyebrow">Aniket Wrapped</p>
          <h1>
            <span>{data.profile.name || GITHUB_USER}</span>
            builds in public like it&apos;s album season.
          </h1>
          <p className="lede">
            A GitHub Wrapped-style highlight reel for the projects, stacks, and momentum behind{" "}
            <a href={data.profile.html_url} target="_blank" rel="noreferrer">
              @{GITHUB_USER}
            </a>
            .
          </p>
          <div className="hero__chips">
            <span>{formatDate(data.profile.created_at)} join date</span>
            <span>{formatCompactNumber(data.followers)} followers</span>
            <span>{sentenceCase(source)} powered</span>
          </div>
        </div>

        <div className="hero__spotlight">
          <div className="hero__cover">
            <p className="hero__cover-label">Headline stat</p>
            <strong>{formatCompactNumber(data.commitEstimate)}</strong>
            <span>estimated public commits across {SAMPLE_REPO_COUNT} recent repos</span>
          </div>
          <div className="hero__aside">
            <span>Top lane</span>
            <h2>{data.primaryLanguage}</h2>
            <p>{data.topLanguageShare}% of sampled language bytes. Clear signature.</p>
          </div>
        </div>
      </section>

      <section className="panel stats-grid">
        <StatCard
          label="Public repos"
          value={formatLongNumber(data.publicRepos)}
          detail="Everything visible on the profile today."
          tone="light"
        />
        <StatCard
          label="Total stars"
          value={formatCompactNumber(data.totalStars)}
          detail="Signals that landed with other developers."
          tone="accent"
        />
        <StatCard
          label="Featured sample"
          value={formatLongNumber(data.featuredRepoCount)}
          detail="Recent source repos used for languages and commit estimates."
          tone="warm"
        />
        <StatCard
          label="Top repo"
          value={heroRepo?.name || "In progress"}
          detail={heroRepo ? `${formatCompactNumber(heroRepo.stargazers_count)} stars` : "Waiting on data"}
          tone="dark"
        />
      </section>

      <section className="panel panel--split">
        <div className="panel__intro">
          <p className="eyebrow">Sound Profile</p>
          <h2>The stack palette behind the profile.</h2>
          <p>
            Language weights come from sampled public repository byte counts, not just the primary
            label on each repo.
          </p>
        </div>
        <LanguageBars items={data.topLanguages} />
      </section>

      <section className="panel panel--split">
        <div className="panel__intro">
          <p className="eyebrow">Star Moments</p>
          <h2>Repositories that stand out on first listen.</h2>
          <p>Sorted by stars first, then by freshness, to keep the showcase page useful.</p>
        </div>
        <div className="repo-grid">
          {data.topRepos.map((repo, index) => (
            <RepoCard key={repo.id} repo={repo} index={index} />
          ))}
        </div>
      </section>

      <section className="panel panel--split">
        <div className="panel__intro">
          <p className="eyebrow">Fresh Drops</p>
          <h2>Recent public work from the timeline.</h2>
          <p>
            Last visible push: <strong>{formatDate(recentDrop?.pushed_at)}</strong>
          </p>
        </div>
        <div className="repo-grid repo-grid--compact">
          {data.recentRepos.map((repo, index) => (
            <RepoCard key={repo.id} repo={repo} index={index} compact />
          ))}
        </div>
      </section>

      <section className="panel panel--finale">
        <div>
          <p className="eyebrow">Share Card</p>
          <h2>
            {data.profile.name || GITHUB_USER} shipped <strong>{formatCompactNumber(data.publicRepos)}</strong>{" "}
            public repos, stacked up <strong>{formatCompactNumber(data.totalStars)}</strong> stars,
            and kept <strong>{data.primaryLanguage}</strong> in heavy rotation.
          </h2>
        </div>
        <div className="finale-stamp">
          <span>@{GITHUB_USER}</span>
          <p>Built for screenshots, hiring loops, and the LinkedIn flex.</p>
        </div>
      </section>

      <footer className="footer">
        <p>
          Commit totals are an estimate from GitHub public contributor stats across {SAMPLE_REPO_COUNT} recent
          non-fork repositories, so private work and some older repos are not counted.
        </p>
        <a href={`https://github.com/${GITHUB_USER}`} target="_blank" rel="noreferrer">
          View GitHub profile
        </a>
      </footer>
    </main>
  );
}

export default App;
