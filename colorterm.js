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
  let random = Math.floor(Math.random() * maxHue);
  let colors = chroma
    .cubehelix()
    .start(random)
    .rotations(((Math.random() - 0.5) * 2).toFixed(2))
    .gamma(defaultGama)
    .lightness(defaultLightness)
    .scale()
    .correctLightness()
    .colors(defaultColorNumber);

  // Convertir les couleurs en format RGBA avec template literals
  let rgbaColors = colors.map((color) => chroma(color).rgba());
  return rgbaColors;
};

/**
 * @param {string[]} array
 * @returns {number[][]}
 */
const RandomColor = (colors = [], MIN_CONTRAST_RATIO = 4.5, attempts = 0) => {
  if (colors.length === 5) {
    return colors.map((color) => chroma(color).rgba());
  }

  const current = chroma.random();

  const isValid =
    colors.length === 0 ||
    chroma.contrast(current, colors[0]) >= MIN_CONTRAST_RATIO;

  if (isValid) {
    colors.push(current);
  } else {
    attempts++;
  }

  if (attempts >= 200) {
    // If none of the colors are valid after 200 attempts, change the first color of the array
    colors[0] = chroma.random();
    attempts = 0; // Reset the attempts counter
  }

  return RandomColor(colors, MIN_CONTRAST_RATIO, attempts);
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
      this.historic.push(this.colors);
      this.position = this.historic.length - 1;
    },
    /**
     * @returns {ColorMap}
     */
    get colorsMap() {
      return {
        background: this.colors[0],
        foreground: this.colors[1],
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
      switch (this.generateMethodeValue) {
        case "iterm":
          return {
            background: rgbaToString(this.colors[0]),
            foreground: rgbaToString(this.colors[1]),
            link: rgbaToString(this.colors[2]),
            selected: rgbaToString(this.colors[3]),
            selectedText: rgbaToString(this.colors[4]),
          };
        case "warp":
          return {
            background: rgbaToString(this.colors[0]),
            foreground: rgbaToString(this.colors[1]),
            accent: rgbaToString(this.colors[2]),
          };
        case "hyper":
          return {
            background: rgbaToString(this.colors[0]),
            foreground: rgbaToString(this.colors[1]),
            selected: rgbaToString(this.colors[3]),
          };
        default:
          break;
      }
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
      let lastPart;
      if (
        this.colorMapCssRgba.selected !== undefined ||
        this.colorMapCssRgba.accent !== undefined
      ) {
        if (this.colorMapCssRgba.selected !== undefined) {
          lastPart = this.colorMapCssRgba.selected;
        } else {
          const match = this.colorMapCssRgba.accent.match(
            /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/,
          );
          if (match) {
            lastPart = match[4];
          }
        }
      }
      return lastPart;
    },

    /**
     * @type {string} - mode cubix, random
     */
    mode: "",

    historic: [],
    position: 0, // Start with -1 indicating no navigation has occurred
    onTheLeft() {
      console.log(this.position);
      if (this.position > 0) {
        this.position--;
      }
      console.log(this.historic.at(this.position)); // Update the colors with the historic entry
    },
    onTheRight() {
      if (this.position < this.historic.length - 1) {
        this.position++;
      }
      console.log("Navigation position", this.position);
      this.colors = this.historic.at(this.position); // Update the colors with the historic entry
    },

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
        credentials: "omit",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
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
