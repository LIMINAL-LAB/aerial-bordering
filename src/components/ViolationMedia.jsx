import ViolationImageCarousel from './ViolationImageCarousel';
import ViolationPdf from './ViolationPdf';
import ViolationVideo from './ViolationVideo';

const ViolationMedia = ({ media }) => {
  const items = (media || []).filter((item) => item.url);
  if (items.length === 0) return null;

  const images = items.filter((item) => item.type === 'image');
  const others = items.filter((item) => item.type !== 'image');

  return (
    <div className="violation-media">
      {images.length > 0 && <ViolationImageCarousel items={images} />}
      {others.map((item, index) => {
        if (item.type === 'pdf') return <ViolationPdf key={index} item={item} />;
        if (item.type === 'video') return <ViolationVideo key={index} item={item} />;
        return (
          <a key={index} href={item.url} target="_blank" rel="noopener noreferrer" className="violation-media-link">
            {item.caption || item.url}
          </a>
        );
      })}
    </div>
  );
};

export default ViolationMedia;
