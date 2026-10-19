import Login from '../pages/login'
import Account from '../pages/account'
import { Access } from '../lib/session'
import {useRoutes} from "react-router-dom"
import LandingPage from "../pages/landing"
import EnquiryPage from "../pages/enquiry"
import Admin from "../pages/admin"


export default function Routes (){
    return useRoutes([
        {path:"/", element: <LandingPage/>},
        {path: "/login", element: <Login/>},
        {path: "/account", element: <Access><Account/></Access>},
        {path: "/enquiry", element: <EnquiryPage/>},
        {path:"/admin", element: <Access admin><Admin/></Access>}
    ])
}