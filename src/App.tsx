import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import AOS from "aos";
import { routes } from "./routes/routes";
import { AdaptiveToastConfig } from "./components/shared/ToastConfig";



const App = () => {


	 useEffect(() => {
     AOS.init({
       duration: 1000,
       easing: "ease-out-cubic",
       once: true,
     });
   }, []);
  return (
    <>
      <RouterProvider router={routes} />
      <AdaptiveToastConfig />
    </>
  );
};

export default App;
