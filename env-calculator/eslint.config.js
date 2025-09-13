const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["scripts/**/*.js"],
    rules: {
      // 脚本文件允许 require，禁用相关规则
      "no-undef": "off"
    }
  }
];
