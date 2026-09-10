import ProductTypeShowcase from "./ProductTypeShowcase";

/** Home page: Customized templates, then optional promo, then Original covers. */
export default function FeaturedTemplatesSlider({ afterSection = null }) {
  return (
    <section className="py-16 lg:py-20" data-testid="featured-templates">
      <ProductTypeShowcase
        layout="grid"
        limit={8}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10"
        afterSection={afterSection}
      />
    </section>
  );
}
