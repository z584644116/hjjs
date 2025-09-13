const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // 允许未使用的变量（以下划线开头）
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      // 允许 any 类型（在必要时）
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },
  {
    files: ["scripts/**/*.js"],
    rules: {
      // 脚本文件允许 require
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];
