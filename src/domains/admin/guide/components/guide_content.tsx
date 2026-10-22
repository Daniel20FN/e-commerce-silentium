import Link from "next/link";
import {
  guideHref,
  searchGuideArticles,
  type GuideCopy,
} from "../services/guide_content";

export function GuideContent({
  copy: c,
  query,
  topic,
}: {
  copy: GuideCopy;
  query: string;
  topic: string;
}) {
  const selected = c.articles.find(
    (article) => article.id === (topic || "primeros-pasos"),
  );
  const results = query ? searchGuideArticles(c.articles, query) : [];
  return (
    <>
      <header>
        <h1>{c.title}</h1>
        <p className="guide-intro">{c.intro}</p>
      </header>
      <form
        action="/admin/guia"
        method="get"
        role="search"
        className="guide-search"
      >
        <div className="guide-search-field">
          <label htmlFor="guide-query">{c.searchLabel}</label>
          <input
            id="guide-query"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={c.searchPlaceholder}
            maxLength={120}
          />
        </div>
        <button type="submit">{c.searchButton}</button>
        {query && (
          <Link href="/admin/guia" prefetch={false}>
            {c.clearSearch}
          </Link>
        )}
      </form>
      <div className="guide-layout">
        <aside className="guide-sidebar">
          <nav aria-label={c.contents}>
            <h3>{c.contents}</h3>
            <ul className="guide-topics">
              {c.articles.map((article) => (
                <li key={article.id}>
                  <Link
                    href={guideHref(article.id)}
                    prefetch={false}
                    aria-current={
                      !query && selected?.id === article.id ? "page" : undefined
                    }
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="guide-body">
          <form
            action="/admin/guia"
            method="get"
            className="guide-topic-picker"
          >
            <label htmlFor="guide-topic">{c.contents}</label>
            <select
              id="guide-topic"
              name="tema"
              defaultValue={selected?.id ?? c.articles[0].id}
            >
              {c.articles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.title}
                </option>
              ))}
            </select>
            <button type="submit">{c.read}</button>
          </form>
          {query ? (
            <section aria-labelledby="guide-results-title" aria-live="polite">
              <h2 id="guide-results-title">{c.resultsTitle}</h2>
              <p>
                {c.resultsCount
                  .replace("{count}", String(results.length))
                  .replace("{query}", query)}
              </p>
              {results.length ? (
                <ul className="guide-results">
                  {results.map((article) => (
                    <li key={article.id}>
                      <h3>
                        <Link href={guideHref(article.id)} prefetch={false}>
                          {article.title}
                        </Link>
                      </h3>
                      <p>{article.summary}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <h3>{c.emptyTitle}</h3>
                  <p>{c.emptyBody}</p>
                </>
              )}
            </section>
          ) : selected ? (
            <article
              className="guide-article"
              aria-labelledby="guide-article-title"
            >
              <h2 id="guide-article-title">{selected.title}</h2>
              <p>{selected.summary}</p>
              <Link
                className="guide-action"
                href={selected.href}
                prefetch={false}
              >
                {selected.action}
              </Link>
              <section>
                <h3>{c.stepsTitle}</h3>
                <ol>
                  {selected.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
              <section>
                <h3>{c.notesTitle}</h3>
                <ul>
                  {selected.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </section>
              <section className="guide-warning">
                <h3>{c.warningTitle}</h3>
                <p>{selected.warning}</p>
              </section>
              <section>
                <h3>{c.exampleTitle}</h3>
                <p>{selected.example}</p>
              </section>
              <section>
                <h3>{c.relatedTitle}</h3>
                <ul className="guide-related">
                  {selected.related.map((id) => {
                    const related = c.articles.find(
                      (article) => article.id === id,
                    );
                    return related ? (
                      <li key={id}>
                        <Link href={guideHref(id)} prefetch={false}>
                          {related.title}
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
              </section>
            </article>
          ) : (
            <section>
              <h2>{c.unknownTitle}</h2>
              <p>{c.unknownBody}</p>
              <Link href="/admin/guia">{c.back}</Link>
            </section>
          )}
        </div>
      </div>
      <p className="guide-footer">{c.privacy}</p>
    </>
  );
}
