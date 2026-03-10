const fs = require('fs');
const PDFParser = require("pdf2json");

let pdfParser = new PDFParser(this, 1);

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    fs.writeFileSync("C:/Antigravity Projects/NOCAP/out.txt", pdfParser.getRawTextContent());
    console.log("SUCCESS");
});

pdfParser.loadPDF("C:/Antigravity Projects/NOCAP/유튜브 가짜뉴스 판별 확장 프로그램 개발.pdf");
