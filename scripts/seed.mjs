// data/db.json을 data/seed.json 내용으로 초기화(리셋)합니다.
// 사용법: npm run seed
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const seedPath = path.join(root, "data", "seed.json");
const dbPath = path.join(root, "data", "db.json");

if (!fs.existsSync(seedPath)) {
  console.error("data/seed.json 파일을 찾을 수 없습니다.");
  process.exit(1);
}

fs.copyFileSync(seedPath, dbPath);
console.log(`시드 데이터로 초기화 완료 → ${dbPath}`);
