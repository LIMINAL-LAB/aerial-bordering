import { useState } from "react";
import ReportImageCarousel from "./ReportImageCarousel";
import ReportFigureFade from "./ReportFigureFade";
import ImageLightbox from "./ImageLightbox";

// Renders a report figure from a { number?, src?, fadeFrom?, images?, caption } block.
// `images` (a set of {src, caption?} items, following ViolationImageCarousel's
// vertical-stack model) renders below the lead `src` when both are present, or on its own
// for figures with no natural lead image. `fadeFrom` marks a figure whose `src` is one
// state of a sequence of maps: it pins and scroll-crossfades from the preceding state
// (see ReportFigureFade). When neither `src` nor `images` is set yet (image pending from
// design) it shows a clearly-marked numbered placeholder so it is obvious which figures
// still need assets.
const ReportFigure = ({ number, src, fadeFrom, images, caption }) => {
  const label = number ? `FIGURE ${number}` : "FIGURE";
  const hasGallery = images && images.length > 0;
  const isPlaceholder = !src && !hasGallery;
  const [enlarged, setEnlarged] = useState(null);

  const handleLeadImageKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setEnlarged({ src, alt: caption || label });
    }
  };

  const captionContent = caption && (
    <>
      {number && <span className="report-figure-caption-label">{label}: </span>}
      {caption}
    </>
  );
  const figcaption = captionContent && (
    <figcaption className="image-caption">{captionContent}</figcaption>
  );

  if (fadeFrom && src) {
    return (
      <figure className="report-figure image-section">
        <ReportFigureFade
          from={fadeFrom}
          to={src}
          alt={caption || label}
          onActivate={() => setEnlarged({ src, fadeFrom, alt: caption || label })}
        >
          {figcaption}
        </ReportFigureFade>
        {enlarged && (
          <ImageLightbox
            src={enlarged.src}
            fadeFrom={enlarged.fadeFrom}
            alt={enlarged.alt}
            figureCaption={captionContent}
            onClose={() => setEnlarged(null)}
          />
        )}
      </figure>
    );
  }

  return (
    <figure className="report-figure image-section">
      {isPlaceholder ? (
        <div className="report-image report-image-placeholder">
          <span className="report-figure-label">{label}</span>
          <span className="report-figure-pending">image pending</span>
        </div>
      ) : (
        <>
          {src && (
            <img
              src={src}
              alt={caption || label}
              className="report-image report-image-zoomable"
              role="button"
              aria-haspopup="dialog"
              tabIndex={0}
              onClick={() => setEnlarged({ src, alt: caption || label })}
              onKeyDown={handleLeadImageKeyDown}
            />
          )}
          {hasGallery && (
            <ReportImageCarousel
              images={images}
              alt={caption || label}
              onEnlarge={(img) => setEnlarged({
                images,
                startIndex: Math.max(0, images.indexOf(img)),
                alt: caption || label,
              })}
            />
          )}
        </>
      )}
      {figcaption}
      {enlarged && (
        <ImageLightbox
          src={enlarged.src}
          fadeFrom={enlarged.fadeFrom}
          images={enlarged.images}
          startIndex={enlarged.startIndex}
          alt={enlarged.alt}
          figureCaption={captionContent}
          onClose={() => setEnlarged(null)}
        />
      )}
    </figure>
  );
};

export default ReportFigure;
