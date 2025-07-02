import React from "react";
import { useNavigate } from "react-router-dom";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      {/* Orange Heading */}
      <h2 className="text-4xl md:text-5xl font-extrabold text-[#FF7A1A] mb-2 tracking-wide">LOREM</h2>
      {/* Subtitle */}
      <h1 className="text-3xl md:text-5xl font-bold text-[#3B4656] mb-4" style={{ fontWeight: 700 }}>
        (Lorem Ipsum is simply dummy text)
      </h1>
      {/* Description */}
      <p className="text-[#5A6473] text-base md:text-lg max-w-2xl mb-10 text-center">
        Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,
      </p>
      {/* Buttons */}
      <div className="flex gap-6 mt-2">
        <button
          className="bg-[#4B2A06] text-white font-semibold px-10 py-4 rounded-xl shadow-lg text-lg transition hover:bg-[#3a2004] focus:outline-none"
          onClick={() => navigate("/login")}
        >
          Get Started
        </button>
        <button
          className="bg-[#F3EFEA] text-[#4B2A06] font-semibold px-10 py-4 rounded-xl text-lg border border-transparent transition hover:bg-[#e7e2db] focus:outline-none"
        >
          Learn more
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
