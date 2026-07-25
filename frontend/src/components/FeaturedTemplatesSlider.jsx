import ProductTypeShowcase from "./ProductTypeShowcase";

/** Home page: Original + Customized paged grid sliders (manual swipe, no autoplay). */
export default function FeaturedTemplatesSlider() {
  return (
    <section className="py-16 lg:py-20" data-testid="featured-templates">
      <ProductTypeShowcase layout="slider" limit={20} className="max-w-7xl mx-auto px-6 lg:px-10" />
    </section>
  );
}
