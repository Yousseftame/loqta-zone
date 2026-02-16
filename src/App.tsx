import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import AOS from "aos";
import { routes } from "./routes/routes";


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
    </>
  );
};

export default App;
