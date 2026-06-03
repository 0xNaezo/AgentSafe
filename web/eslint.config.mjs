import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: ["target/**", "coverage/**"],
  },
];

export default eslintConfig;
