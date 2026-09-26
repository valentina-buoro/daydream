import {useRoutes} from "react-router-dom"
import LandingPage from "../pages/landing"
import EnquiryPage from "../pages/enquiry"


export default function Routes (){
    return useRoutes([
        {path:"/", element: <LandingPage/>},
        {path: "/enquiry", element: <EnquiryPage/>},
    ])
}