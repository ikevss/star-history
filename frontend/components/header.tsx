import React, { useState } from "react";
import GitHubStarButton from "./GitHubStarButton";
import Link from "next/link";
import { SketchLightBulbIcon } from "./SketchIcons";

const Header: React.FC = () => {
  const [showDropMenu, setShowDropMenu] = useState(false);

  return (
    <>
        <header className="w-full h-14 shrink-0 flex flex-row justify-center items-center bg-dark text-light">
          <div className="w-full h-full flex flex-row justify-between items-center px-4">
            <div className="h-full bg-dark flex flex-row justify-start items-center">
              <Link href="/" className="header-link px-3 gap-2">
                <img className="w-7 h-auto logo-spin" src="/assets/logo-icon.png" alt="Starboard" />
                <span className="text-white text-base font-semibold tracking-tight" style={{ fontFamily: "xkcd, cursive" }}>Starboard</span>
              </Link>
              <Link href="/blog" className="header-link text-base">
                <span className="text-white -2">Blog</span>
              </Link>
            </div>
            <div className="hidden md:flex flex-row justify-center items-center">
              <Link href="/blog/how-to-use-github-star-history" className="flex flex-row items-center text-base px-2 hover:underline">
                <span className="text-white flex items-center gap-1"><SketchLightBulbIcon /> 使用说明</span>
              </Link>
            </div>
            <div className="h-full hidden md:flex flex-row justify-end items-center px-3">
              <GitHubStarButton />
            </div>

            <div className="h-full flex md:hidden flex-row justify-end items-center">
              <button
                aria-label="切换菜单"
                aria-expanded={showDropMenu}
                className="relative h-full w-10 px-3 flex flex-row justify-center items-center cursor-pointer font-semibold text-light hover:bg-zinc-800 bg-transparent border-none"
                onClick={() => setShowDropMenu((prev) => !prev)}
              >
                <span className={`w-4 transition-all h-px bg-light absolute top-1/2 ${showDropMenu ? "w-6 rotate-45" : "-mt-1"}`}></span>
                <span className={`w-4 transition-all h-px bg-light absolute top-1/2 ${showDropMenu ? "hidden" : ""}`}></span>
                <span className={`w-4 transition-all h-px bg-light absolute top-1/2 ${showDropMenu ? "w-6 -rotate-45" : "mt-1"}`}></span>
              </button>
            </div>
          </div>
        </header>
        <div className={`w-full h-auto py-2 flex md:hidden flex-col justify-start items-start shadow-lg border-b ${showDropMenu ? "flex" : "hidden"}`}>
          <Link href="/blog" className="h-12 px-3 text-base w-full flex flex-row justify-start items-center text-dark hover:bg-gray-100 hover:text-blue-500">
            Blog
          </Link>
          <Link href="/blog/how-to-use-github-star-history" className="h-12 px-3 text-base w-full flex flex-row justify-start items-center text-dark hover:bg-gray-100 hover:text-blue-500">
            使用说明
          </Link>
          <span className="h-12 text-base px-3 w-full flex flex-row justify-start items-center text-dark">
            <GitHubStarButton />
          </span>
        </div>
    </>
  );
};

export default Header;
