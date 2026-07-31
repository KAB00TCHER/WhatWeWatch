// js/app.js
// Application launch. Deliberately tiny — every real decision belongs in
// one of the other files, not here.

import { initHomePage } from './home.js';
import { initWheel } from "./wheel.js";

document.addEventListener('DOMContentLoaded', initHomePage,initWheel);
