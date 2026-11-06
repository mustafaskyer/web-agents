import { Link } from "react-router";
import { ProductArt } from "../components/ProductArt";
import { ProductGrid } from "../components/ProductCard";
import { allCategories, allProducts, listByCategory } from "../data/catalog";
import { useTitle } from "../lib/useTitle";
import { NewsletterForm } from "../tools/NewsletterForm";
import styles from "./Home.module.css";

const EDIT = ["ocean-tee", "stoneware-mug", "canvas-tote", "linen-throw"];
const FEATURED_CATEGORIES = ["apparel", "home"];

export function Home() {
  useTitle("");
  const edit = allProducts().filter((p) => EDIT.includes(p.slug));
  const categories = allCategories().filter((c) => FEATURED_CATEGORIES.includes(c.slug));
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.glow} aria-hidden="true" />
        <p className="eyebrow">Field Store · a WebMCP demo</p>
        <h1>
          Everyday goods, built to <span className={styles.accent}>stay</span>
        </h1>
        <p className={styles.lede}>
          Heavyweight basics and slow-living objects. Ask an agent to shop for you and watch it work: every action here is a tool.
        </p>
        <div className={styles.ctas}>
          <Link to="/products" className="btn primary">
            Shop all products
          </Link>
          <a href="#edit" className="btn ghost">
            See the edit
          </a>
        </div>
      </section>

      <section id="edit" className="page" aria-labelledby="edit-title">
        <div className={styles.sectionHead}>
          <div>
            <p className="eyebrow">The everyday edit</p>
            <h2 id="edit-title">Pieces on repeat</h2>
          </div>
          <Link to="/products" className="btn ghost">
            View all
          </Link>
        </div>
        <ProductGrid products={edit} />
      </section>

      <section className="page" aria-label="Categories">
        <div className={styles.tiles}>
          {categories.map((c) => {
            const art = listByCategory(c.slug)[0]?.images[0];
            return (
              <Link key={c.slug} to={`/category/${c.slug}`} className={styles.tile}>
                {art && <ProductArt art={art} name={c.name} />}
                <div className={styles.tileText}>
                  <h2>{c.name}</h2>
                  <p>{c.blurb}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="page" aria-labelledby="news-title">
        <div className={styles.newsletter}>
          <div>
            <h2 id="news-title">One email a month</h2>
            <p className="muted">New pieces, restocks and the occasional essay. No sales countdowns.</p>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
