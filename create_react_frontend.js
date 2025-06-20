// create_react_frontend.js
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const appName = "frontend";

console.log("🚀 Creating React App with Vite...");
execSync(`npm create vite@latest ${appName} -- --template react`, { stdio: "inherit" });

const appPath = path.join(process.cwd(), appName);
process.chdir(appPath);

console.log("📦 Installing dependencies...");
execSync("npm install react-router-dom", { stdio: "inherit" });

console.log("🧱 Creating pages...");
const pages = ["Home", "About", "Contact"];
fs.mkdirSync("src/pages", { recursive: true });

pages.forEach((page) => {
  const content = `export default function ${page}() {
  return <div><h1>${page} Page</h1></div>;
}
`;
  fs.writeFileSync(`src/pages/${page}.jsx`, content);
});

console.log("🧩 Replacing App.jsx...");
const appContent = `import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link> | <Link to="/about">About</Link> | <Link to="/contact">Contact</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </BrowserRouter>
  );
}
`;
fs.writeFileSync("src/App.jsx", appContent);

console.log("✅ All set! Run:");
console.log(`\n  cd ${appName}`);
console.log(`  npm install`);
console.log(`  npm run dev`);
