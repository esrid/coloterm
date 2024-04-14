import "./coloris.min.css";
import "./coloris.min.js"
import "./favicon.ico"
import "./build.css"
import Alpine from "alpinejs";
import { colorTerm } from "./colorterm"
window.Alpine = Alpine;
Alpine.data("app", colorTerm);
Alpine.start();
