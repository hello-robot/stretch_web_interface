const { resolve } = require('path');
import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';

const root = resolve(__dirname, 'src');

export default defineConfig({
    root,
    build: {
        rollupOptions: {
            input: {
                main: resolve(root, 'index.html'),
                login: resolve(root, 'login/index.html'),
                // register: resolve(root, 'src', 'pages', 'register.html'),
                // robot: resolve(root, 'src/pages/robot/robot.html'),
                // operator: resolve(root, 'src/pages/operator/operator.html')
            }
        }
    },
    // ...vite configures
  server: {
    // vite server configs, for details see [vite doc](https://vitejs.dev/config/#server-host)
    port: 3000
  },
  plugins: [
    ...VitePluginNode({
      adapter: 'express',
      appPath: './app.ts',
    })
  ]
});