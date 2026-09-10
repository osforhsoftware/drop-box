import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { api, resolveMediaUrl } from "../lib/api";

export default function ShopByCategory() {
  const scrollRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  // For drag-to-scroll
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/case-types");
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to load case types", err);
      }
    }
    load();
  }, []);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 5);
    setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [categories]);

  const handleScroll = () => {
    checkScroll();
  };

  const scrollByAmount = (amount) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftStart.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = "grabbing";
    scrollRef.current.style.userSelect = "none";
  };

  const handlePointerLeave = () => {
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "grab";
      scrollRef.current.style.userSelect = "auto";
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "grab";
      scrollRef.current.style.userSelect = "auto";
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2; // scroll-fast
    scrollRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
          <div className="label-eyebrow mb-2">Find your fit</div>
          <h2 className="font-display text-3xl md:text-4xl text-white">
            Shop by Category
          </h2>
          <p className="text-white/50 text-sm md:text-base mt-2">
            Premium protection, finished your way.
          </p>
          </div>
          <Link to="/shop" className="hidden sm:inline-flex text-sm text-white/65 hover:text-brand-light transition-colors">
            View all cases
          </Link>
        </div>

        <div className="relative group rounded-3xl border border-brand/10 bg-[#111511] px-2 sm:px-5 py-4 sm:py-6">
          {showLeft && (
            <button
              onClick={() => scrollByAmount(-300)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white text-black shadow-lg hover:scale-105 transition-transform"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            onPointerDown={handlePointerDown}
            onPointerLeave={handlePointerLeave}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            className="flex gap-3 sm:gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar py-2 px-1"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none', 
              WebkitOverflowScrolling: 'touch',
              cursor: 'grab' 
            }}
          >
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?case_type=${encodeURIComponent(cat.slug)}`}
                draggable={false}
                className="snap-start shrink-0 flex flex-col items-center gap-3 w-[100px] sm:w-[120px] md:w-[132px] group/card"
              >
                <div className="w-[92px] h-[92px] sm:w-[112px] sm:h-[112px] md:w-[124px] md:h-[124px] bg-[#f4f6f2] rounded-2xl shadow-sm flex items-center justify-center p-3 transition-all duration-500 ease-out group-hover/card:-translate-y-1 group-hover/card:shadow-[0_18px_35px_rgba(0,0,0,.3)] pointer-events-none overflow-hidden">
                  {cat.image && (
                    <img
                      src={resolveMediaUrl(cat.image)}
                      alt={cat.name}
                      className="w-full h-full object-contain drop-shadow-md transition-transform duration-500 group-hover/card:scale-105"
                      draggable={false}
                    />
                  )}
                </div>
                <span className="text-xs sm:text-sm font-medium text-white/85 text-center pointer-events-none">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>

          {showRight && (
            <button
              onClick={() => scrollByAmount(300)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white text-black shadow-lg hover:scale-105 transition-transform"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}