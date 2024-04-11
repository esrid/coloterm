import "./output.css"
import "./coloris.min.css";
import "./coloris.min.js"
import Alpine from "alpinejs";
import {colorTerm} from "./colorterm"
window.Alpine = Alpine;
Alpine.data("app", colorTerm);
Alpine.start();
