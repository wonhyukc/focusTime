const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 48, 128];
const inputFile = path.join(__dirname, 'images', 'icon.svg');
const outputDir = path.join(__dirname, 'images');

// 출력 디렉토리가 없으면 생성
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 각 크기별로 아이콘 생성
sizes.forEach(size => {
    sharp(inputFile)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `icon${size}.png`))
        .then(() => {
            console.log(`Created icon${size}.png`);
        })
        .catch(err => {
            console.error(`Error creating icon${size}.png:`, err);
        });
}); 