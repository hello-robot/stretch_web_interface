const { resolve } = require('path');
import { defineConfig } from 'vite';

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
    }
});