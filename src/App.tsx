import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import AOS from "aos";
import { routes } from "./routes/routes";
import { AdaptiveToastConfig } from "./components/shared/ToastConfig";
import SplashScreen from "./components/shared/Splashscreen";

const App = () => {
  // splashDone: splash has fully exited → mount the real router
  const [splashDone, setSplashDone] = useState(false);

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
          minDuration={2600} // ms — tune this to match your Firebase load time
        />
      )}

      {/*
        RouterProvider + page content is NOT mounted until splash is done.
        This means HeroSections, SplitText, AOS animations etc. are all
        created fresh the moment the splash exits — they will always play.
      */}
      {splashDone && (
        <>
          <RouterProvider router={routes} />
          <AdaptiveToastConfig />
        </>
      )}
    </>
  );
};

export default App;
