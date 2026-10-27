import { useState } from "react";

// Horizontal crossfade carousel for report figure galleries. Renders every image at
// once inside a single stacking container (grid-area layering in CSS) so the fade
// transition has both a from- and to-image to cross; only the active slide is
// interactive/visible. `transition` is a hook for a future non-fade variant — only
// "fade" is implemented today.
const ReportImageCarousel = ({ images, transition = "fade", alt, onEnlarge }) => {
  const [index, setIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const total = images.length;

  const handleEnlargeKeyDown = (image) => (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onEnlarge?.(image);
    }
  };

  if (total === 1) {
    const image = images[0];
    return (
      <div className={`report-carousel report-carousel-${transition}`} aria-roledescription="carousel">
        <figure className="report-carousel-slide report-carousel-slide-active">
          <img
            className="report-carousel-img report-image-zoomable"
            src={image.src}
            alt={image.caption || alt || ""}
            role="button"
            aria-haspopup="dialog"
            tabIndex={0}
            onClick={() => onEnlarge?.(image)}
            onKeyDown={handleEnlargeKeyDown(image)}
          />
          {image.caption && <figcaption className="report-carousel-caption">{image.caption}</figcaption>}
        </figure>
      </div>
    );
  }

  const goPrev = () => setIndex((current) => (current === 0 ? total - 1 : current - 1));
  const goNext = () => setIndex((current) => (current === total - 1 ? 0 : current + 1));

  const handleKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  };

  return (
    <div
      className={`report-carousel report-carousel-${transition}`}
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {images.map((image, i) => {
        const isActive = i === index;
        return (
          <figure
            key={i}
            className={`report-carousel-slide${isActive ? " report-carousel-slide-active" : ""}`}
            aria-hidden={!isActive}
          >
            <img
              className={`report-carousel-img${isActive ? " report-image-zoomable" : ""}`}
              src={image.src}
              alt={image.caption || alt || ""}
              role={isActive ? "button" : undefined}
              aria-haspopup={isActive ? "dialog" : undefined}
              tabIndex={isActive ? 0 : undefined}
              onClick={isActive ? () => onEnlarge?.(image) : undefined}
              onKeyDown={isActive ? handleEnlargeKeyDown(image) : undefined}
            />
            {image.caption && <figcaption className="report-carousel-caption">{image.caption}</figcaption>}
          </figure>
        );
      })}
      <button
        type="button"
        className="report-carousel-arrow report-carousel-arrow-prev"
        aria-label="Previous image"
        onClick={goPrev}
      >
        ‹
      </button>
      <button
        type="button"
        className="report-carousel-arrow report-carousel-arrow-next"
        aria-label="Next image"
        onClick={goNext}
      >
        ›
      </button>
      <div className="report-carousel-dots">
        {images.map((_, i) => {
          const isActive = i === index;
          return (
            <button
              key={i}
              type="button"
              className={`report-carousel-dot${isActive ? " report-carousel-dot-active" : ""}`}
              aria-label={`Go to image ${i + 1} of ${total}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => setIndex(i)}
            />
          );
        })}
        <span className="report-carousel-count">{`${index + 1} / ${total}`}</span>
      </div>
    </div>
  );
};

export default ReportImageCarousel;
