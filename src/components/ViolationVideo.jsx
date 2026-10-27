
const ViolationVideo = ({ item }) => (
  <video
    src={item.url}
    controls
    className="violation-media-video"
  />
);

export default ViolationVideo;
