import "./src/styles/global.css"
import "./src/styles/inner-pages.css"

import React from "react"
import Advertising from "./src/components/Advertising"
export const wrapRootElement=({element})=><Advertising>{element}</Advertising>
