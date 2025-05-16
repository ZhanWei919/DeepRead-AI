const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  publicPath: "./",
  transpileDependencies: true,
  devServer: {
    proxy: {
      // 将所有以 /api 开头的请求代理到后端服务器
      "/api": {
        target: "http://localhost:8008", // 你的 FastAPI 后端地址
        changeOrigin: true, // 必须设置为 true，表示支持跨域
      },
    },
  },
});
