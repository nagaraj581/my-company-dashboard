const fs = require("fs");

try {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

  let [major, minor, patch] = pkg.version.split(".").map(Number);
  patch += 1;

  pkg.version = `${major}.${minor}.${patch}`;

  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
  console.log("📌 Version bumped to:", pkg.version);
} catch (err) {
  console.error("❌ Version bump failed:", err);
}
