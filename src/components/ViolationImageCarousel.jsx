
// Despite the name, this renders all images as a vertical stack (no slider /
// arrows / dots). Kept as a component so ViolationMedia's import is unchanged.
const ViolationImageCarousel = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="violation-media-carousel">
      {items.map((item, i) => (
        <figure key={i} className="violation-media-stack-item">
          <img
            src={item.url}
            alt={item.caption || ''}
            className="violation-media-carousel-img"
          />
          {item.caption && (
            <figcaption className="violation-media-caption">{item.caption}</figcaption>
          )}
        </figure>
      ))}
    </div>
  );
};

export default ViolationImageCarousel;
