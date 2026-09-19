import { copyFileSync, cpSync, mkdirSync, unlinkSync } from 'node:fs'

mkdirSync('assets', { recursive: true })
copyFileSync('dist/app.html', 'dist/index.html')
unlinkSync('dist/app.html')
copyFileSync('dist/index.html', 'index.html')
cpSync('dist/assets', 'assets', { recursive: true })
