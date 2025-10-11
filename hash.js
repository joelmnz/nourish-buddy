
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: bun hash.js <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log(hash);