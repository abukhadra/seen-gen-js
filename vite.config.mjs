import { resolve } from 'path'

import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
    build: {
        target: "ES2022",      
        outDir: ".",
        emptyOutDir: false,
        assetsInlineLimit: Number.MAX_SAFE_INTEGER,
        cssMinify: true, 
		    minify: true,      
        lib: {
            entry: resolve(__dirname, 'src/javascript.js'),
            formats: ['es'],
            name: 'SeenGenJS',
            fileName: () => 'gen-js.js',
        },          
        rollupOptions: {},
      },    
	plugins: [
    vue(), 
    viteSingleFile({ 
        useRecommendedBuildConfig: true,
        deleteInlinedFiles: true,    
        removeViteModuleLoader: true, 
    })
  ],
})
