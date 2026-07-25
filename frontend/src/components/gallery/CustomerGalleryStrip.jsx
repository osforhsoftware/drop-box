import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { ArrowRight } from "lucide-react";

import { api } from "../../lib/api";

import GalleryCard from "./GalleryCard";



// Approx rendered width of a single card + gap.

const ITEM_WIDTH = 240 + 20;



const MIN_FOR_MARQUEE = 6;



export default function CustomerGalleryStrip() {

  const [items, setItems] = useState([]);

  const [paused, setPaused] = useState(false);

  const [viewportWidth, setViewportWidth] = useState(

    typeof window !== "undefined" ? window.innerWidth : 1440

  );



  useEffect(() => {

    api.get("/gallery/featured", { params: { limit: 16 } })

      .then((r) => setItems(r.data || []))

      .catch(() => setItems([]));

  }, []);



  useEffect(() => {

    const onResize = () => setViewportWidth(window.innerWidth);

    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);

  }, []);



  const isMarquee = items.length >= MIN_FOR_MARQUEE;



  const slides = useMemo(() => {

    if (!items.length || !isMarquee) return [];

    const setWidth = items.length * ITEM_WIDTH;

    const copies = Math.max(1, Math.ceil((viewportWidth * 1.5) / setWidth));

    const oneSet = Array.from({ length: copies }).flatMap(() => items);

    return [...oneSet, ...oneSet];

  }, [items, viewportWidth, isMarquee]);



  if (!items.length) return null;



  return (

    <section

      id="loved-by-customers"

      className="py-24 overflow-hidden"

      data-testid="customer-gallery-strip"

    >

      <div className="max-w-7xl mx-auto px-6 lg:px-10 mb-10">

        <div className="label-eyebrow">Real Customers</div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mt-3">

          <h2 className="font-display text-4xl lg:text-5xl">

            Loved by Our Customers

          </h2>

          <Link

            to="/gallery"

            className="btn-secondary inline-flex items-center gap-2 self-start sm:self-auto"

            data-testid="view-gallery-cta"

          >

            View Customer Gallery <ArrowRight className="w-4 h-4" />

          </Link>

        </div>

      </div>



      {isMarquee ? (

        <div

          className="relative"

          onMouseEnter={() => setPaused(true)}

          onMouseLeave={() => setPaused(false)}

          onTouchStart={() => setPaused(true)}

          onTouchEnd={() => setPaused(false)}

        >

          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-[var(--bg)] to-transparent z-10 pointer-events-none" />

          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-[var(--bg)] to-transparent z-10 pointer-events-none" />



          <div

            className={`gallery-marquee flex gap-4 sm:gap-5 w-max items-stretch ${paused ? "gallery-marquee-paused" : ""}`}

          >

            {slides.map((item, i) => (

              <GalleryCard

                key={`${item.id}-${i}`}

                item={item}

                index={i}

                variant="strip"

                to="/gallery"

              />

            ))}

          </div>

        </div>

      ) : (

        <div className="max-w-7xl mx-auto px-6 lg:px-10">

          <div className="flex flex-wrap justify-center gap-4 sm:gap-5">

            {items.map((item, i) => (

              <GalleryCard key={item.id} item={item} index={i} variant="strip" to="/gallery" />

            ))}

          </div>

        </div>

      )}

    </section>

  );

}

