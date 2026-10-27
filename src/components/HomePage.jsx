import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ContentSection from "./ContentSection";
import "./HomePage.css";

const HomePage = () => {
  const navigate = useNavigate();
  const homePageRef = useRef(null);
  const hasTransitioned = useRef(false);

  const contentSections = [
    {
      text: "Since 2017, the EU border agency Frontex has spearheaded an extensive programme of surveillance from the sky.",
    },
    {
      text: "Through planes and a drone, it monitors the Central Mediterranean and facilitates the interception of migrants at sea and their return to abuse in Libya and Tunisia.",
    },
    {
      text: "This platform unravels this system of aerial violence, evidence of which can be found in Frontex's own documentation.",
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (hasTransitioned.current) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Check if user has scrolled to within 100px of the bottom
      const nearBottom = scrollTop + windowHeight >= documentHeight - 100;

      if (nearBottom) {
        hasTransitioned.current = true;

        // Add fade-out class to trigger CSS transition
        if (homePageRef.current) {
          homePageRef.current.classList.add('fade-out');
        }

        // Navigate after fade animation completes
        setTimeout(() => {
          navigate('/report');
          // Reset scroll position to top
          window.scrollTo(0, 0);
        }, 500); // Match the CSS transition duration
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Reset transition flag when component mounts
    hasTransitioned.current = false;

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [navigate]);

  return (
    <div className="home-page" ref={homePageRef}>
      <video
        className="home-page-video"
        autoPlay
        loop
        muted
        playsInline
      >
        <source
          src={`/Pixel_sky_Loop1.mp4`}
          type="video/mp4"
        />
      </video>
      <div className="content-container">
        {contentSections.map((section, index) => (
          <ContentSection
            key={index}
            text={section.text}
          />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
