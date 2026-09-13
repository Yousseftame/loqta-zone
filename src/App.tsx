import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import AOS from "aos";
import { routes } from "./routes/routes";
import { AdaptiveToastConfig } from "./components/shared/ToastConfig";
import SplashScreen from "./components/shared/Splashscreen";

const App = () => {
  // splashDone: splash has fully exited → mount the real router
  const [splashDone, setSplashDone] = useState(false);

  // We delay mounting the router by just 100ms. 
  // This allows the Splash Screen video to successfully start playing and paint 
  // before the main thread gets busy mounting the React Router and Homepage.
  const [startApp, setStartApp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStartApp(true), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Only init AOS after content mounts, so scroll animations fire fresh
    if (splashDone) {
      AOS.init({
        duration: 1000,
        easing: "ease-out-cubic",
        once: true,
      });
    }
  }, [splashDone]);

  return (
    <>
      {/* Splash: always rendered first, unmounts itself via onComplete */}
      {!splashDone && (
        <SplashScreen
          onComplete={() => setSplashDone(true)}
          minDuration={2600}
        />
      )}

      {/* Mount router after 150ms so background fetching begins, but doesn't choke the video's start */}
      {startApp && (
        <>
          <RouterProvider router={routes} />
          <AdaptiveToastConfig />
        </>
      )}
    </>
  );
};

export default App;
