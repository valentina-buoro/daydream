import {useRoutes} from "react-router-dom"
import LandingPage from "../pages/landing"
import EnquiryPage from "../pages/enquiry"
import Admin from "../pages/admin"


export default function Routes (){
    return useRoutes([
        {path:"/", element: <LandingPage/>},
        {path: "/enquiry", element: <EnquiryPage/>},
        {path:"/admin", element: <Admin/>}
    ])
}