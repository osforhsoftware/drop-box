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
    <section className="py-12 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="mb-8 flex flex-col items-center md:items-start text-center md:text-left">
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl text-white">
            Shop by Category
          </h2>
          <p className="text-white/60 text-sm md:text-base mt-2">
            Find your perfect phone case
          </p>
        </div>

        <div className="relative group">
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
            className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar py-4 px-2"
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
                className="snap-start shrink-0 flex flex-col items-center gap-3 w-[80px] sm:w-[100px] md:w-[120px] group/card"
              >
                <div className="w-[70px] h-[70px] sm:w-[90px] sm:h-[90px] md:w-[110px] md:h-[110px] bg-white rounded-2xl md:rounded-[28px] shadow-sm flex items-center justify-center p-3 transition-all duration-300 group-hover/card:scale-105 group-hover/card:shadow-xl pointer-events-none">
                  {cat.image && (
                    <img
                      src={resolveMediaUrl(cat.image)}
                      alt={cat.name}
                      className="w-full h-full object-contain drop-shadow-md"
                      draggable={false}
                    />
                  )}
                </div>
                <span className="text-xs sm:text-sm font-medium text-white/90 text-center pointer-events-none">
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