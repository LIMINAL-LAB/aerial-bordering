import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReportFigureFade from "./ReportFigureFade";
import "./ImageLightbox.css";

// Full-screen lightbox overlay for an enlarged report image. Rendered via a portal onto
// document.body so no ancestor's overflow/transform clips it; sits above the navigation
// bar (z-index 1000, see NavigationBar.css) at z-index 2000. Closes on backdrop click,
// the close button, or Escape — clicking the image itself does not close it.
const ImageLightbox = ({
  src,
  fadeFrom,
  alt,
  figureCaption,
  images,
  startIndex = 0,
  onClose,
}) => {
  const isGallery = !!images && images.length > 1;
  const [index, setIndex] = useState(startIndex);
  const total = images ? images.length : 0;
  const current = images ? images[index] : null;
  const imageSrc = current ? current.src : src;
  const imageCaption = current ? current.caption : null;
  const imageAlt = (current && current.caption) || alt;
  const goPrev = () => setIndex((i) => (i === 0 ? total - 1 : i - 1));
  const goNext = () => setIndex((i) => (i === total - 1 ? 0 : i + 1));
  const navRef = useRef({});
  navRef.current = { isGallery, goPrev, goNext };

  const closeButtonRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const dialogRef = useRef(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [fadeHeight, setFadeHeight] = useState(null);

  // Size the scroll area to the pinned figure (image + caption) so the scrollbar spans
  // just the figure rather than the whole viewport.
  useEffect(() => {
    if (!fadeFrom) return undefined;
    const sticky = scrollAreaRef.current?.querySelector(".report-figure-fade-sticky");
    if (!sticky || typeof ResizeObserver === "undefined") return undefined;
    const update = () => setFadeHeight(sticky.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(sticky);
    return () => observer.disconnect();
  }, [fadeFrom]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (navRef.current.isGallery) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          navRef.current.goPrev();
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          navRef.current.goNext();
          return;
        }
      }

      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll(
          'button:not([disabled]), [tabindex="0"]'
        );
        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Restore the original scroll lock and return keyboard focus to the image that
      // opened the dialog, without scrolling the report away from its previous position.
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={dialogRef}
      className="image-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={imageAlt}
      onClick={onClose}
    >
      <button
        type="button"
        className="image-lightbox-close"
        aria-label="Close enlarged image"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        ref={closeButtonRef}
      >
        ×
      </button>
      <div
        ref={scrollAreaRef}
        className="image-lightbox-content"
        tabIndex={0}
        style={fadeHeight ? { height: fadeHeight } : undefined}
        onScroll={(event) => setScrollOffset(event.currentTarget.scrollTop)}
        onClick={(event) => event.stopPropagation()}
      >
        {fadeFrom ? (
          <figure className="image-lightbox-figure">
            <ReportFigureFade
              from={fadeFrom}
              to={src}
              alt={alt}
              scrollRootRef={scrollAreaRef}
              scrollOffset={scrollOffset}
            >
              {figureCaption && (
                <div className="image-lightbox-caption">{figureCaption}</div>
              )}
            </ReportFigureFade>
          </figure>
        ) : (
          <figure className="image-lightbox-figure">
            {isGallery ? (
              <div
                className="report-carousel report-carousel-fade image-lightbox-carousel"
                aria-roledescription="carousel"
              >
                {images.map((image, i) => (
                  <div
                    key={i}
                    className={`report-carousel-slide${i === index ? " report-carousel-slide-active" : ""}`}
                    aria-hidden={i !== index}
                  >
                    <img
                      className="image-lightbox-img"
                      src={image.src}
                      alt={image.caption || alt || ""}
                    />
                  </div>
                ))}
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
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`report-carousel-dot${i === index ? " report-carousel-dot-active" : ""}`}
                      aria-label={`Go to image ${i + 1} of ${total}`}
                      aria-current={i === index ? "true" : undefined}
                      onClick={() => setIndex(i)}
                    />
                  ))}
                  <span className="report-carousel-count">{`${index + 1} / ${total}`}</span>
                </div>
              </div>
            ) : (
              <img className="image-lightbox-img" src={imageSrc} alt={imageAlt || ""} />
            )}
            {(figureCaption || imageCaption) && (
              <figcaption className="image-lightbox-caption">
                {figureCaption}
                {imageCaption && <div>{imageCaption}</div>}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ImageLightbox;
