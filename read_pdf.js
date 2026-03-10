const fs = require('fs');
const pdf = require('pdf-parse');

(async () => {
    try {
        console.log("Reading file...");
        let dataBuffer = fs.readFileSync('C:/Antigravity Projects/NOCAP/유튜브 가짜뉴스 판별 확장 프로그램 개발.pdf');
        console.log("Parsing PDF...");
        let data = await pdf(dataBuffer);
        console.log("Writing output...");
        fs.writeFileSync('C:/Antigravity Projects/NOCAP/out.txt', data.text);
        console.log("SUCCESS");
    } catch (e) {
        console.error("ERROR:", e);
    }
})();
