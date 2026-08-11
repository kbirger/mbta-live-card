import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/mbta-live-card.ts",
  output: {
    file: "dist/mbta-live-card.js",
    format: "es",
    sourcemap: true,
  },
  plugins: [resolve(), commonjs(), typescript(), terser()],
};
