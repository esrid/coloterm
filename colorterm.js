import chroma from "chroma-js";
Coloris({
  themeMode: "dark",
  alpha: true,
  forceAlpha: true,
  format: "rgb",
});
/**
 * @typedef {Object} ColorMap
 * @property {number[]} foreground - The foreground color.
 * @property {number[]} background - The background color.
 * @property {number[]} link - The link color.
 * @property {number[]} selected - The selected color.
 * @property {number[]} selectedText - The color of selected text.
 */
/**
 * @typedef {Object} ColorMapCSS
 * @property {string} foreground - The foreground color.
 * @property {string} background - The background color.
 * @property {string} link - The link color.
 * @property {string} selected - The selected color.
 * @property {string} selectedText - The color of selected text.
 */
// ALL THE CONSTANT
const maxHue = 360;
const defaultGama = 0.7;
const defaultLightness = [0.3, 0.8];
const defaultColorNumber = 5;
// ALL THE CONSTANT END

// MANIPULATE COLOR FUNCTION END
const CubeHelix = () => {
  const MIN_CONTRAST_RATIO = 5.5; // Minimum acceptable contrast ratio

  let random = Math.floor(Math.random() * maxHue);
  let background = chroma.random(); // Generate a random background color

  let colors = [];
  let attempts = 0;
  while (colors.length < defaultColorNumber && attempts < 100) {
    let color = chroma
      .cubehelix()
      .start(random)
      .rotations(((Math.random() - 0.5) * 2).toFixed(2))
      .gamma(defaultGama)
      .lightness(defaultLightness)
      .scale()
      .correctLightness()
      .colors(1)[0];

    // Check the contrast ratio between the color and the background
    let contrastRatio = chroma.contrast(color, background);
    if (contrastRatio >= MIN_CONTRAST_RATIO) {
      colors.push(color);
      attempts = 0; // Reset the attempts counter if a color is added
    } else {
      attempts++;
    }
  }

  // Convert the colors to RGBA format
  let rgbaColors = colors.map((color) => chroma(color).rgba());
  return rgbaColors;
};
/**
 * @returns {number[][]}
 */
const RandomColor = () => {
  const MIN_CONTRAST_RATIO = 4.5; // Minimum acceptable contrast ratio

  let background = chroma.random(); // Generate a random background color
  let colors = [];

  let attempts = 0;
  while (colors.length < 5 && attempts < 100) {
    let color = chroma.random().rgba();

    // Check the contrast ratio between the color and the background
    let contrastRatio = chroma.contrast(color, background);
    if (contrastRatio >= MIN_CONTRAST_RATIO) {
      colors.push(color);
      attempts = 0; // Reset the attempts counter if a color is added
    } else {
      attempts++;
    }
  }

  return colors;
};

// MANIPULATE COLOR FUNCTION END
/**
 * @param { string } params - mode value : cubix, random
 * @returns {number[][]}
 */
function SwitchMode(params) {
  switch (params) {
    case "cubix":
      return CubeHelix();
    case "random":
      return RandomColor();
    default:
      return RandomColor();
  }
}

export function colorTerm() {
  return {
    /**
     *  @type {number[][]}
     */
    colors: [],

    changeMode() {
      this.colors = SwitchMode(this.mode);
    },
    /**
     * @returns {ColorMap}
     */
    get colorsMap() {
      return {
        foreground: this.colors[0],
        background: this.colors[1],
        link: this.colors[2],
        selected: this.colors[3],
        selectedText: this.colors[4],
      };
    },
    /**
     * @returns {ColorMapCSS}
     */
    get colorMapCssRgba() {
      /**
       * @param {number[]} rgbaArray
       * @returns {string}
       */
      const rgbaToString = (rgbaArray) =>
        `rgba(${rgbaArray[0]}, ${rgbaArray[1]}, ${rgbaArray[2]}, ${rgbaArray[3]})`;
      return {
        foreground: rgbaToString(this.colors[0]),
        background: rgbaToString(this.colors[1]),
        link: rgbaToString(this.colors[2]),
        selected: rgbaToString(this.colors[3]),
        selectedText: rgbaToString(this.colors[4]),
      };
    },

    /**
     *
     * @param {string} key
     * @param {string} newValue
     * @returns {void}
     */
    updateColor(key, newValue) {
      const colorKeys = Object.keys(this.colorMapCssRgba);
      const index = colorKeys.indexOf(key);

      if (index !== -1) {
        const updatedColors = [...this.colors];
        updatedColors[index] = chroma(newValue).rgba();
        this.colors = updatedColors;
      }
    },
    /**
     * Function to get the alpha value of the selected color.
     * @returns {number|null} Alpha value of the selected color, or null if not found.
     */
    get SelectedAlpha() {
      const selectedColor = this.colorMapCssRgba.selected;
      const rgbaValues = selectedColor
        .split(",")
        .map((value) => parseFloat(value.trim()));
      const alpha = rgbaValues.length === 4 ? rgbaValues[3] : null; // Alpha value is the fourth element

      return alpha;
    },

    /**
     * @type {string} - mode cubix, random
     */
    mode: "",

    handleChangeSelect(e) {
      this.mode = e;
    },

    run() {
      this.colors = SwitchMode(this.mode);
    },

    init() {
      this.colors = SwitchMode(this.mode);
    },

    generateMethodeValue: "iterm",

    handleGenerateMethode(event) {
      this.generateMethodeValue = event;
    },

    generate: async function() {
      let data = {
        generateMode: this.generateMethodeValue,
        colors: this.colorMapCssRgba,
      };
      const { blob, filename } = await fetch("/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        credentials: "omit",
        cache: "no-cache",
        body: JSON.stringify(data),
      }).then(async (res) => {
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition");
        const match =
          disposition &&
          disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        const filename =
          match && decodeURIComponent(match[1].replace(/['"]/g, ""));
        return { blob, filename };
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      a.download = filename;

      document.body.appendChild(a);

      a.click();

      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}
